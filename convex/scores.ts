import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  buildOutScore,
  buildOutSummary,
  regulationPoints,
  regulationScore,
  regulationSummary,
} from "../src/lib/scoring/formulas";

// Step 9 of the bills job and step 5 of the facilities job (docs/pipeline.md).
// Both jobs call `recompute` with the states they touched. The formulas live
// in src/lib/scoring/formulas.ts so the /scoring page shows the same numbers;
// docs/scoring.md explains them.

async function rescore(ctx: MutationCtx, codes: string[]): Promise<number> {
  const areas = await ctx.db.query("regulationAreas").collect();
  const labels = Object.fromEntries(areas.map((a) => [a.key, a.label]));
  let n = 0;
  for (const code of codes) {
    const state = await ctx.db
      .query("states")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!state) continue;

    const grades = await ctx.db
      .query("stateRegulationAreaGrades")
      .withIndex("by_state", (q) => q.eq("state", code))
      .collect();
    const facilities = await ctx.db
      .query("facilities")
      .withIndex("by_state", (q) => q.eq("state", code))
      .collect();

    const tiers = Object.fromEntries(grades.map((g) => [g.regulationArea, g.tier]));
    const points = regulationPoints(tiers);
    const buildOut = buildOutScore(facilities);

    await ctx.db.patch(state._id, {
      aiRegulation: {
        score: regulationScore(points),
        summary: regulationSummary(tiers, labels),
        points,
      },
      dataCenterPosture: {
        score: buildOut.score,
        summary: buildOutSummary(buildOut),
        points: Math.round(buildOut.operatingMw),
      },
      verifiedAt: new Date().toISOString().slice(0, 10),
    });
    n++;
  }
  return n;
}

export const recompute = internalMutation({
  args: { states: v.array(v.string()) },
  handler: async (ctx, { states }) => ({ states: await rescore(ctx, states) }),
});

/** Rescore every state. Run after changing a formula; costs no API calls. */
export const recomputeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const states = await ctx.db.query("states").collect();
    return { states: await rescore(ctx, states.map((s) => s.code)) };
  },
});
