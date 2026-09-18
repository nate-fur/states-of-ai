import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { classifyBill, type Category } from "./classify";
import { tierCategory } from "./tier";

// Re-run the agents over what is already in Convex. Neither touches LegiScan.
//
// `reclassify` re-runs the classifier on saved bills from their stored text,
// then re-tiers and rescores whatever changed. Use it after changing the
// classifier prompt, the categories, or the model.
//
// `retier` re-runs the tier agent for every graded category and rescores.
// Use it after changing the tier prompt or model.

const counts = v.object({
  classified: v.number(),
  changed: v.number(),
  dropped: v.number(),
  missingText: v.number(),
  openaiCalls: v.number(),
  errors: v.array(v.string()),
});
type Counts = typeof counts.type;
type BatchResult = { counts: Counts; remaining: number; done: boolean };

const KEEP = 20;

function describe(c: Counts): string {
  return (
    `classified ${c.classified}, changed ${c.changed}, dropped ${c.dropped}, missingText ${c.missingText}, openai ${c.openaiCalls}` +
    (c.errors.length ? `, errors ${c.errors.length}` : "")
  );
}

/** Queue every saved bill (one state, or all) for re-classification. */
export const reclassify = internalAction({
  args: { state: v.optional(v.string()), batchSize: v.optional(v.number()) },
  handler: async (ctx, { state, batchSize = 10 }): Promise<{ states: number; bills: number }> => {
    const ids = await ctx.runQuery(internal.legiscan.db.billIds, { state });
    const byState = new Map<string, string[]>();
    for (const b of ids) byState.set(b.state, [...(byState.get(b.state) ?? []), b.externalId]);
    let i = 0;
    for (const [code, queue] of byState) {
      const runId = await ctx.runMutation(internal.pipelineRuns.start, {
        job: `reclassify:${code}`,
        summary: `${queue.length} bills queued`,
      });
      await ctx.scheduler.runAfter(i * 2_000, internal.legiscan.rerun.reclassifyBatch, {
        state: code,
        runId,
        queue,
        batchSize,
        touched: [],
        counts: { classified: 0, changed: 0, dropped: 0, missingText: 0, openaiCalls: 0, errors: [] },
      });
      i++;
    }
    return { states: byState.size, bills: ids.length };
  },
});

export const reclassifyBatch = internalAction({
  args: {
    state: v.string(),
    runId: v.id("pipelineRuns"),
    queue: v.array(v.string()),
    batchSize: v.number(),
    touched: v.array(v.string()),
    counts,
  },
  handler: async (ctx, args): Promise<BatchResult> => {
    const { state, runId, batchSize } = args;
    const c = args.counts;
    const touched = new Set(args.touched);
    const batch = args.queue.slice(0, batchSize);
    const rest = args.queue.slice(batchSize);
    let stop = false;

    const categories: Category[] = await ctx.runQuery(internal.legiscan.db.categories, {});
    const bills = await ctx.runQuery(internal.legiscan.db.billsWithText, { state, externalIds: batch });

    for (const bill of bills) {
      const blob = bill.storageId ? await ctx.storage.get(bill.storageId) : null;
      if (!blob) {
        c.missingText++;
        continue;
      }
      try {
        const result = await classifyBill(ctx, {
          state,
          number: bill.number,
          title: bill.title,
          status: bill.status,
          session: bill.session,
          text: await blob.text(),
          categories,
        });
        c.openaiCalls++;
        c.classified++;

        if (!result.relevant) {
          await ctx.runMutation(internal.legiscan.db.deleteBill, { externalId: bill.externalId });
          await ctx.runMutation(internal.legiscan.db.rememberSkip, {
            externalId: bill.externalId,
            state,
            changeHash: bill.changeHash,
            reason: "not about AI (reclassify)",
          });
          bill.categories.forEach((k) => touched.add(k));
          c.dropped++;
          continue;
        }

        const before = [...bill.categories].sort().join(",");
        const after = [...result.categories].sort().join(",");
        await ctx.runMutation(internal.legiscan.db.patchClassification, {
          externalId: bill.externalId,
          categories: result.categories,
          summary: result.summary,
          keyPoints: result.keyPoints,
        });
        // Summaries feed the tier agent too, so every reclassified bill's
        // categories get re-tiered, not only the ones whose tags moved.
        bill.categories.forEach((k) => touched.add(k));
        result.categories.forEach((k) => touched.add(k));
        if (before !== after) c.changed++;
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
      await ctx.scheduler.runAfter(0, internal.legiscan.rerun.reclassifyBatch, {
        ...args,
        queue: rest,
        touched: [...touched],
        counts: c,
      });
      return { counts: c, remaining: rest.length, done: false };
    }

    const retiered = await retierCategories(ctx, state, [...touched], categories, c);
    await ctx.runMutation(internal.pipelineRuns.finish, {
      id: runId,
      ok: c.errors.length === 0,
      summary: `${describe(c)}; retiered ${retiered}` + (stop ? `; stopped: ${rest.length} left` : ""),
    });
    return { counts: c, remaining: stop ? rest.length : 0, done: true };
  },
});

/** Re-tier every graded category in one state (or all states) and rescore. */
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
    const c: Counts = { classified: 0, changed: 0, dropped: 0, missingText: 0, openaiCalls: 0, errors: [] };
    const categories: Category[] = await ctx.runQuery(internal.legiscan.db.categories, {});
    const keys: string[] = await ctx.runQuery(internal.legiscan.db.gradedCategories, { state });
    const retiered = await retierCategories(ctx, state, keys, categories, c);
    await ctx.runMutation(internal.pipelineRuns.finish, {
      id: runId,
      ok: c.errors.length === 0,
      summary: `retiered ${retiered} of ${keys.length}, openai ${c.openaiCalls}` + (c.errors.length ? `, errors ${c.errors.length}` : ""),
    });
    return { retiered, errors: c.errors };
  },
});

/** Steps 7 to 10 of the bills job for a given set of categories. */
async function retierCategories(
  ctx: ActionCtx,
  state: string,
  keys: string[],
  categories: Category[],
  c: Counts,
): Promise<number> {
  let retiered = 0;
  for (const key of keys) {
    const category = categories.find((x) => x.key === key);
    if (!category) continue;
    try {
      const bills = await ctx.runQuery(internal.legiscan.db.billsForCategory, { state, category: key });
      const { tier, reason } = await tierCategory(ctx, { state, category, bills });
      c.openaiCalls++;
      console.log(`${state}/${key}: tier ${tier} (${reason})`);
      await ctx.runMutation(internal.legiscan.db.upsertGrade, { state, category: key, tier });
      retiered++;
    } catch (err) {
      c.errors = [...c.errors, `tier ${key}: ${err instanceof Error ? err.message : String(err)}`].slice(-KEEP);
    }
  }
  if (keys.length > 0) await ctx.runMutation(internal.scores.recompute, { states: [state] });
  return retiered;
}
