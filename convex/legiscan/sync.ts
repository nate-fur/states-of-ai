import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { envNumber, pipelinesEnabled } from "../pipelines";
import { STATES } from "../seedData";
import { getBill, getBillText, getSearchRaw, searchAllPages } from "./client";
import { classifyBill, skipReason, type Area } from "./classify";
import { describeBill } from "./describe";
import { tierArea } from "./tier";
import {
  base64ToString,
  byYear,
  htmlToText,
  latestText,
  mapStatus,
  normalizeBillNumber,
  searchQuery,
  textsNewestFirst,
  sinceFilter,
  type BillText,
  type BillTextDoc,
} from "./parse";
import { countText } from "../../src/lib/bill/parse";

// LegiScan bills job (docs/pipeline.md, "LegiScan bills").
//
// `syncState` finds a state's candidate bills with one search call, drops
// the ones whose change hash we already know, and then works through the
// rest in batches. Each batch is its own scheduled action so the whole state
// can take longer than one action's ten-minute limit. Re-tiering and scoring
// happen once, after the last batch.

type Candidate = { billId: number; changeHash: string };

const candidate = v.object({ billId: v.number(), changeHash: v.string() });

const counts = v.object({
  fetched: v.number(),
  textUnchanged: v.number(),
  dropped: v.number(),
  saved: v.number(),
  legiscanCalls: v.number(),
  typesafeCalls: v.number(),
  openaiCalls: v.number(),
  processed: v.array(v.string()), // last few "SB524 Title" entries
  errors: v.array(v.string()), // last few error messages
});
type Counts = typeof counts.type;

type BatchResult = { counts: Counts; remaining: number; retiered?: number; done: boolean };

type SyncResult = {
  state: string;
  dryRun: boolean;
  searched: number;
  searchCalls: number;
  unchanged: number;
  pending: number;
  queued?: number;
  years?: Record<string, number>;
  batch?: BatchResult;
};

const KEEP = 20; // how many processed/error entries to carry between batches

function emptyCounts(): Counts {
  return { fetched: 0, textUnchanged: 0, dropped: 0, saved: 0, legiscanCalls: 0, typesafeCalls: 0, openaiCalls: 0, processed: [], errors: [] };
}

function describe(c: Counts, extra = ""): string {
  return (
    `${extra}fetched ${c.fetched}, textUnchanged ${c.textUnchanged}, dropped ${c.dropped}, saved ${c.saved}, ` +
    `legiscan ${c.legiscanCalls}, typesafe ${c.typesafeCalls}, openai ${c.openaiCalls}` +
    (c.errors.length ? `, errors ${c.errors.length}` : "")
  );
}

export const syncState = internalAction({
  args: {
    state: v.string(),
    // ISO date. When set, uses the full (paged) search so hits can be
    // filtered by last action date; for the initial fill. When unset, uses
    // the raw search: one call, current session, hashes only.
    since: v.optional(v.string()),
    batchSize: v.optional(v.number()), // bills per scheduled action
    maxTotal: v.optional(v.number()), // bills this run may process in total
    dryRun: v.optional(v.boolean()), // search and compare only
  },
  handler: async (ctx, { state, since, batchSize = 5, maxTotal, dryRun = false }): Promise<SyncResult> => {
    const limit = maxTotal ?? batchSize;
    const runId = await ctx.runMutation(internal.pipelineRuns.start, {
      job: `legiscan:${state}`,
      summary: dryRun ? "dry run: searching" : "searching",
    });

    try {
      // 1. One search covers every phrase.
      let found: Candidate[];
      let searchCalls: number;
      let years: Record<string, number> | undefined;
      if (since) {
        const { hits, calls } = await searchAllPages(ctx, { state, query: searchQuery(), year: 1 });
        searchCalls = calls;
        years = byYear(hits);
        found = sinceFilter(hits, since).map((h) => ({ billId: h.bill_id, changeHash: h.change_hash }));
      } else {
        const hits = await getSearchRaw(ctx, { state, query: searchQuery(), year: 2 });
        searchCalls = 1;
        found = hits.map((h) => ({ billId: h.bill_id, changeHash: h.change_hash }));
      }

      // 2. Drop bills we already know at this hash: saved ones and remembered skips.
      const saved: SavedBills = await ctx.runQuery(internal.legiscan.db.savedBills, { state });
      const skips: Record<string, string> = await ctx.runQuery(internal.legiscan.db.skippedBills, { state });
      const changed = found.filter(
        (c) => saved[String(c.billId)]?.changeHash !== c.changeHash && skips[String(c.billId)] !== c.changeHash,
      );
      const queue = changed.slice(0, limit);

      const head = `searched ${found.length} (${searchCalls} calls), unchanged ${found.length - changed.length}, pending ${changed.length}`;
      if (dryRun) {
        await ctx.runMutation(internal.pipelineRuns.finish, { id: runId, ok: true, summary: `dry run: ${head}` });
        return { state, dryRun, searched: found.length, searchCalls, unchanged: found.length - changed.length, pending: changed.length, years };
      }

      // 3+. Work through the queue in batches; the first one runs right here.
      const c = emptyCounts();
      c.legiscanCalls = searchCalls;
      const batch = await runBatch(ctx, { state, runId, queue, batchSize, touched: [], counts: c, head });
      return { state, dryRun, searched: found.length, searchCalls, unchanged: found.length - changed.length, pending: changed.length, queued: queue.length, years, batch };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.pipelineRuns.finish, { id: runId, ok: false, summary: `failed: ${message}` });
      throw err;
    }
  },
});

/** One batch of a state's queue. Reschedules itself until the queue is empty. */
export const processBatch = internalAction({
  args: {
    state: v.string(),
    runId: v.id("pipelineRuns"),
    queue: v.array(candidate),
    batchSize: v.number(),
    touched: v.array(v.string()),
    counts,
    head: v.string(),
  },
  handler: async (ctx, args): Promise<BatchResult> => runBatch(ctx, args),
});

type SavedBills = Record<string, { changeHash: string; textHash: string; status: string; regulationAreas: string[] }>;

/** Convert what LegiScan sent into plain text. PDFs go through the Node action once. */
async function toPlainText(ctx: ActionCtx, doc: BillTextDoc): Promise<string> {
  if (doc.mime === "application/pdf") {
    return ctx.runAction(internal.legiscan.pdf.pdfToText, { base64: doc.doc });
  }
  const raw = base64ToString(doc.doc);
  return doc.mime === "text/html" ? htmlToText(raw) : raw;
}

type BatchArgs = {
  state: string;
  runId: Id<"pipelineRuns">;
  queue: Candidate[];
  batchSize: number;
  touched: string[];
  counts: Counts;
  head: string;
};

async function runBatch(ctx: ActionCtx, args: BatchArgs): Promise<BatchResult> {
  const { state, runId, batchSize, head } = args;
  const c = args.counts;
  const touched = new Set(args.touched);
  const batch = args.queue.slice(0, batchSize);
  const rest = args.queue.slice(batchSize);
  let stop = false;

  const areas: Area[] = await ctx.runQuery(internal.legiscan.db.areas, {});
  const saved: SavedBills = await ctx.runQuery(internal.legiscan.db.savedBills, { state });

  for (const cand of batch) {
    const externalId = String(cand.billId);
    const prev = saved[externalId];
    try {
      // 3. Full details.
      const bill = await getBill(ctx, cand.billId);
      c.legiscanCalls++;
      c.fetched++;
      c.processed = [...c.processed, `${bill.bill_number} ${bill.title}`].slice(-KEEP);

      const status = mapStatus(bill.status);
      const meta = {
        externalId,
        number: normalizeBillNumber(bill.bill_number),
        title: bill.title,
        date: bill.status_date,
        url: bill.url,
        session: bill.session.session_name,
        changeHash: bill.change_hash,
      };

      // Dropping a bill: remove it if saved, and remember the skip so the
      // next run does not pay to look at it again.
      const drop = async (reason: string) => {
        if (prev) {
          await ctx.runMutation(internal.legiscan.db.deleteBill, { externalId });
          prev.regulationAreas.forEach((k) => touched.add(k));
        }
        await ctx.runMutation(internal.legiscan.db.rememberSkip, { externalId, state, changeHash: bill.change_hash, reason });
        c.dropped++;
      };

      // Vetoed or failed.
      if (!status) {
        await drop("vetoed or failed");
        continue;
      }

      // 4. Latest text. No text yet means nothing to classify; the change
      // hash moves when text is added, so the skip expires on its own.
      const text = latestText(bill);
      if (!text) {
        await drop("no text yet");
        continue;
      }

      // Same text as last time: only the status moved, so skip the classifier.
      if (prev && prev.textHash === text.text_hash) {
        await ctx.runMutation(internal.legiscan.db.patchBillStatus, { ...meta, status });
        if (prev.status !== status) prev.regulationAreas.forEach((k) => touched.add(k));
        c.textUnchanged++;
        continue;
      }

      // Convert to plain text once and keep it, so the classifier can be
      // re-run later without another LegiScan call. Some states file the
      // final version as a scanned PDF with no text layer (Colorado's
      // chaptered acts come off a Xerox), so fall back to the previous
      // version when extraction comes back empty.
      let doc: BillTextDoc | null = null;
      let used: BillText | null = null;
      let plain = "";
      for (const version of textsNewestFirst(bill).slice(0, 3)) {
        doc = await getBillText(ctx, version.doc_id);
        used = version;
        c.legiscanCalls++;
        plain = await toPlainText(ctx, doc);
        if (plain.trim()) break;
        console.warn(`${state} ${bill.bill_number}: ${version.type} ${version.doc_id} has no text (${doc.mime}); trying earlier version`);
      }
      if (!doc || !used || !plain.trim()) throw new Error("no text in any version");
      const storageId = await ctx.storage.store(new Blob([plain], { type: "text/plain" }));
      await ctx.runMutation(internal.legiscan.db.saveBillText, {
        externalId,
        state,
        textHash: doc.text_hash,
        mime: doc.mime,
        storageId,
        chars: plain.length,
        ...countText(plain),
        textDate: used.date,
        textType: used.type,
      });

      // 5a. Classifier (Jev): is it about AI, and which areas.
      const input = { state, number: bill.bill_number, title: bill.title, status, session: bill.session.session_name, text: plain };
      const tags = await classifyBill(ctx, { ...input, areas });
      c.typesafeCalls += tags.calls;

      if (!tags.relevant) {
        await drop(skipReason(tags.relevance));
        continue;
      }

      // 5b. Writer (generative model): title, gist, and per-area text for the tagged areas.
      const tagged = tags.regulationAreas.map((t) => areas.find((a) => a.key === t.key)!);
      const prose = await describeBill(ctx, { ...input, areas: tagged });
      c.openaiCalls++;

      // 6. Save the bill and its per-area summaries and takeaways.
      await ctx.runMutation(internal.legiscan.db.upsertBill, {
        ...meta,
        state,
        status,
        textHash: doc.text_hash,
        relevance: tags.relevance,
        shortTitle: prose.shortTitle,
        gist: prose.gist,
        regulationAreas: prose.regulationAreas.map((a) => ({
          ...a,
          probability: tags.regulationAreas.find((t) => t.key === a.key)?.probability,
        })),
      });
      c.saved++;
      tags.regulationAreas.forEach((a) => touched.add(a.key));
      prev?.regulationAreas.forEach((k) => touched.add(k));
    } catch (err) {
      const message = `${externalId}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(message);
      c.errors = [...c.errors, message].slice(-KEEP);
      // A cap error will repeat for every bill; stop instead of spinning.
      if (message.includes("monthly cap")) {
        stop = true;
        break;
      }
    }
  }

  // More to do: hand the rest to the next scheduled action.
  if (rest.length > 0 && !stop) {
    await ctx.runMutation(internal.pipelineRuns.update, {
      id: runId,
      summary: `${head}; ${describe(c)}; ${rest.length} still queued`,
    });
    await ctx.scheduler.runAfter(0, internal.legiscan.sync.processBatch, {
      ...args,
      queue: rest,
      touched: [...touched],
      counts: c,
    });
    return { counts: c, remaining: rest.length, done: false };
  }

  // 7-8. Re-tier only the touched areas, once for the whole run.
  let retiered = 0;
  for (const key of touched) {
    const area = areas.find((x) => x.key === key);
    if (!area) continue;
    try {
      const bills = await ctx.runQuery(internal.legiscan.db.billsForArea, { state, regulationArea: key });
      const g = await tierArea(ctx, { state, area, bills });
      c.typesafeCalls += g.typesafeCalls;
      c.openaiCalls += g.openaiCalls;
      console.log(`${state}/${key}: tier ${g.tier} (${g.note})`);
      await ctx.runMutation(internal.legiscan.db.upsertGrade, {
        state,
        regulationArea: key,
        tier: g.tier,
        confidence: g.confidence,
        note: g.note,
        basisBillIds: g.basisBillIds,
      });
      retiered++;
    } catch (err) {
      c.errors = [...c.errors, `tier ${key}: ${err instanceof Error ? err.message : String(err)}`].slice(-KEEP);
    }
  }

  // 9-10. Scores.
  if (touched.size > 0) {
    await ctx.runMutation(internal.scores.recompute, { states: [state] });
  }

  await ctx.runMutation(internal.pipelineRuns.finish, {
    id: runId,
    ok: c.errors.length === 0,
    summary: `${head}; ${describe(c)}; retiered ${retiered}` + (stop ? `; stopped: ${rest.length} left in queue` : ""),
  });
  return { counts: c, remaining: stop ? rest.length : 0, retiered, done: true };
}

/** Cron entrypoint. Schedules one `syncState` per state, a few seconds apart. */
export const runAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    if (!pipelinesEnabled()) {
      console.log("legiscan: PIPELINES_ENABLED is not true, skipping");
      return { scheduled: 0 };
    }
    const maxTotal = envNumber("LEGISCAN_MAX_BILLS_PER_STATE", 50);
    const spacingMs = 5_000;
    let i = 0;
    for (const { code } of STATES) {
      await ctx.scheduler.runAfter(i * spacingMs, internal.legiscan.sync.syncState, { state: code, maxTotal });
      i++;
    }
    const runId = await ctx.runMutation(internal.pipelineRuns.start, { job: "legiscan" });
    await ctx.runMutation(internal.pipelineRuns.finish, {
      id: runId,
      ok: true,
      summary: `scheduled ${i} states, maxTotal ${maxTotal} each; see legiscan:<state> runs`,
    });
    return { scheduled: i };
  },
});
