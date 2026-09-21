import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { classifyBill, skipReason, type Area } from "./classify";
import { describeBill } from "./describe";
import { tierArea } from "./tier";
import { countText } from "../../src/lib/bill/parse";

// Re-run the agents over what is already in Convex. None of these touch
// LegiScan; each works from the stored bill text.
//
// `reclassify` re-runs the classifier (Jev) on saved bills. Bills that are
// no longer about AI are dropped. Bills whose areas changed get their text
// rewritten by the writer (generative model), since the summaries and
// takeaways are per area; bills whose areas stayed the same keep their
// text and only get fresh probabilities. Touched areas are re-tiered.
// Cheap: Jev calls for every bill, OpenAI calls only where tags moved.
//
// `redescribe` re-runs the writer on saved bills without changing their
// tags, then re-tiers their areas (the tier agent reads the summaries).
// Use it after changing the writing prompt or the generative model.
//
// `retier` re-runs the tier agent (Jev plus one note per area) for every
// graded area and rescores. Use it after changing a rubric.
//
// All three take an optional `state`; `reclassify` and `redescribe` also
// take `externalIds` for a targeted run.
//   npx convex run legiscan/rerun:reclassify '{}'
//   npx convex run legiscan/rerun:redescribe '{"state":"CA"}'
//   npx convex run legiscan/rerun:retier '{}'

const counts = v.object({
  classified: v.number(),
  changed: v.number(),
  dropped: v.number(),
  described: v.number(),
  missingText: v.number(),
  typesafeCalls: v.number(),
  openaiCalls: v.number(),
  errors: v.array(v.string()),
});
type Counts = typeof counts.type;
type BatchResult = { counts: Counts; remaining: number; done: boolean };

const KEEP = 20;

function emptyCounts(): Counts {
  return { classified: 0, changed: 0, dropped: 0, described: 0, missingText: 0, typesafeCalls: 0, openaiCalls: 0, errors: [] };
}

function describe(c: Counts): string {
  return (
    `classified ${c.classified}, changed ${c.changed}, dropped ${c.dropped}, described ${c.described}, missingText ${c.missingText}, ` +
    `typesafe ${c.typesafeCalls}, openai ${c.openaiCalls}` +
    (c.errors.length ? `, errors ${c.errors.length}` : "")
  );
}

const queueArgs = {
  state: v.optional(v.string()),
  externalIds: v.optional(v.array(v.string())),
  batchSize: v.optional(v.number()),
};

/** Group the wanted bills by state and schedule one batch chain per state. */
async function queueByState(
  ctx: ActionCtx,
  job: "reclassify" | "redescribe",
  args: { state?: string; externalIds?: string[]; batchSize?: number },
): Promise<{ states: number; bills: number }> {
  const all = await ctx.runQuery(internal.legiscan.db.billIds, { state: args.state });
  const ids = args.externalIds ? all.filter((b) => args.externalIds!.includes(b.externalId)) : all;
  const byState = new Map<string, string[]>();
  for (const b of ids) byState.set(b.state, [...(byState.get(b.state) ?? []), b.externalId]);
  let i = 0;
  for (const [code, queue] of byState) {
    const runId = await ctx.runMutation(internal.pipelineRuns.start, {
      job: `${job}:${code}`,
      summary: `${queue.length} bills queued`,
    });
    await ctx.scheduler.runAfter(i * 2_000, internal.legiscan.rerun.batch, {
      job,
      state: code,
      runId,
      queue,
      batchSize: args.batchSize ?? 10,
      touched: [],
      counts: emptyCounts(),
    });
    i++;
  }
  return { states: byState.size, bills: ids.length };
}

/** Queue saved bills (one state, all, or specific externalIds) for the classifier. */
export const reclassify = internalAction({
  args: queueArgs,
  handler: (ctx, args) => queueByState(ctx, "reclassify", args),
});

/** Queue saved bills (one state, all, or specific externalIds) for the writer. */
export const redescribe = internalAction({
  args: queueArgs,
  handler: (ctx, args) => queueByState(ctx, "redescribe", args),
});

export const batch = internalAction({
  args: {
    job: v.union(v.literal("reclassify"), v.literal("redescribe")),
    state: v.string(),
    runId: v.id("pipelineRuns"),
    queue: v.array(v.string()),
    batchSize: v.number(),
    touched: v.array(v.string()),
    counts,
  },
  handler: async (ctx, args): Promise<BatchResult> => {
    const { job, state, runId, batchSize } = args;
    const c = args.counts;
    const touched = new Set(args.touched);
    const batch = args.queue.slice(0, batchSize);
    const rest = args.queue.slice(batchSize);
    let stop = false;

    const areas: Area[] = await ctx.runQuery(internal.legiscan.db.areas, {});
    const bills = await ctx.runQuery(internal.legiscan.db.billsWithText, { state, externalIds: batch });

    for (const bill of bills) {
      const blob = bill.storageId ? await ctx.storage.get(bill.storageId) : null;
      if (!blob) {
        c.missingText++;
        continue;
      }
      try {
        const text = await blob.text();
        // The text is in hand, so refresh the parse counts the reader shows.
        await ctx.runMutation(internal.legiscan.db.patchTextCounts, { externalId: bill.externalId, ...countText(text) });
        const input = { state, number: bill.number, title: bill.title, status: bill.status, session: bill.session, text };

        let keys = bill.regulationAreas;
        let relevance: number | undefined;
        let probability = (key: string): number | undefined => bill.probabilities[key];

        if (job === "reclassify") {
          const tags = await classifyBill(ctx, { ...input, areas });
          c.typesafeCalls += tags.calls;
          c.classified++;
          if (!tags.relevant) {
            await ctx.runMutation(internal.legiscan.db.deleteBill, { externalId: bill.externalId });
            await ctx.runMutation(internal.legiscan.db.rememberSkip, {
              externalId: bill.externalId,
              state,
              changeHash: bill.changeHash,
              reason: `${skipReason(tags.relevance)} (reclassify)`,
            });
            bill.regulationAreas.forEach((k) => touched.add(k));
            c.dropped++;
            continue;
          }
          relevance = tags.relevance;
          probability = (key) => tags.regulationAreas.find((t) => t.key === key)?.probability;
          keys = tags.regulationAreas.map((t) => t.key);
          const before = [...bill.regulationAreas].sort().join(",");
          const after = [...keys].sort().join(",");
          if (before === after) {
            // Same areas: the text still fits. Keep it, refresh the numbers.
            await ctx.runMutation(internal.legiscan.db.patchTags, {
              externalId: bill.externalId,
              relevance,
              regulationAreas: tags.regulationAreas,
            });
            continue;
          }
          c.changed++;
        }

        // Write (or rewrite) the prose for the bill's areas.
        const tagged = keys.map((k) => areas.find((a) => a.key === k)).filter((a): a is Area => Boolean(a));
        const prose = await describeBill(ctx, { ...input, areas: tagged });
        c.openaiCalls++;
        c.described++;
        await ctx.runMutation(internal.legiscan.db.saveClassification, {
          externalId: bill.externalId,
          state,
          textHash: bill.textHash,
          relevance: relevance ?? bill.relevance,
          shortTitle: prose.shortTitle,
          gist: prose.gist,
          regulationAreas: prose.regulationAreas.map((a) => ({ ...a, probability: probability(a.key) })),
        });
        // Summaries feed the tier agent too, so old and new areas are re-tiered.
        bill.regulationAreas.forEach((k) => touched.add(k));
        keys.forEach((k) => touched.add(k));
      } catch (err) {
        const message = `${bill.number}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(message);
        c.errors = [...c.errors, message].slice(-KEEP);
        if (message.includes("monthly cap")) {
          stop = true;
          break;
        }
      }
    }

    if (rest.length > 0 && !stop) {
      await ctx.runMutation(internal.pipelineRuns.update, { id: runId, summary: `${describe(c)}; ${rest.length} still queued` });
      await ctx.scheduler.runAfter(0, internal.legiscan.rerun.batch, {
        ...args,
        queue: rest,
        touched: [...touched],
        counts: c,
      });
      return { counts: c, remaining: rest.length, done: false };
    }

    const retiered = await retierAreas(ctx, state, [...touched], areas, c);
    await ctx.runMutation(internal.pipelineRuns.finish, {
      id: runId,
      ok: c.errors.length === 0,
      summary: `${describe(c)}; retiered ${retiered}` + (stop ? `; stopped: ${rest.length} left` : ""),
    });
    return { counts: c, remaining: stop ? rest.length : 0, done: true };
  },
});

/** Re-tier every graded area in one state (or all states) and rescore. */
export const retier = internalAction({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, { state }): Promise<{ states: number }> => {
    const ids = await ctx.runQuery(internal.legiscan.db.billIds, { state });
    const states = [...new Set(ids.map((b) => b.state))].sort();
    let i = 0;
    for (const code of states) {
      await ctx.scheduler.runAfter(i * 2_000, internal.legiscan.rerun.retierState, { state: code });
      i++;
    }
    return { states: states.length };
  },
});

export const retierState = internalAction({
  args: { state: v.string() },
  handler: async (ctx, { state }): Promise<{ retiered: number; errors: string[] }> => {
    const runId = await ctx.runMutation(internal.pipelineRuns.start, { job: `retier:${state}` });
    const c = emptyCounts();
    const areas: Area[] = await ctx.runQuery(internal.legiscan.db.areas, {});
    const keys: string[] = await ctx.runQuery(internal.legiscan.db.gradedAreas, { state });
    const retiered = await retierAreas(ctx, state, keys, areas, c);
    await ctx.runMutation(internal.pipelineRuns.finish, {
      id: runId,
      ok: c.errors.length === 0,
      summary:
        `retiered ${retiered} of ${keys.length}, typesafe ${c.typesafeCalls}, openai ${c.openaiCalls}` +
        (c.errors.length ? `, errors ${c.errors.length}` : ""),
    });
    return { retiered, errors: c.errors };
  },
});

/** Steps 7 to 10 of the bills job for a given set of areas. */
async function retierAreas(
  ctx: ActionCtx,
  state: string,
  keys: string[],
  areas: Area[],
  c: Counts,
): Promise<number> {
  let retiered = 0;
  for (const key of keys) {
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
  if (keys.length > 0) await ctx.runMutation(internal.scores.recompute, { states: [state] });
  return retiered;
}
