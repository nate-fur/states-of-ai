import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Step 9 of the bills job and step 5 of the facilities job (docs/pipeline.md).
// Both jobs call `recompute` with the states they touched.
//
// PLACEHOLDER FORMULAS. docs/pipeline.md says the formulas are not decided.
// These exist so the pipeline runs end to end; replace them deliberately.

const DATA_CENTER_AREA = "dc";
const MAX_TIER = 4;

export function aiRegulationScore(tiers: number[], areaCount: number): number {
  if (areaCount === 0) return 0;
  const total = tiers.reduce((a, b) => a + b, 0);
  return Math.round((6 * total) / (areaCount * MAX_TIER));
}

export function dataCenterPostureScore(dcTier: number, operational: number, planned: number): number {
  // Regulation of data centers pulls toward restrict; a build pipeline that
  // outpaces the operating base pulls toward accelerate.
  const restrict = (dcTier / MAX_TIER) * 3;
  const build = operational + planned === 0 ? 0 : (planned / (operational + planned)) * 3;
  return Math.max(-3, Math.min(3, Math.round(build - restrict)));
}

export const recompute = internalMutation({
  args: { states: v.array(v.string()) },
  handler: async (ctx, { states }) => {
    const areas = await ctx.db.query("regulationAreas").collect();
    for (const code of states) {
      const state = await ctx.db
        .query("states")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!state) continue;

      const grades = await ctx.db
        .query("stateAreaGrades")
        .withIndex("by_state", (q) => q.eq("state", code))
        .collect();
      const facilities = await ctx.db
        .query("facilities")
        .withIndex("by_state", (q) => q.eq("state", code))
        .collect();

      const operational = facilities.filter((f) => f.status === "operational").length;
      const planned = facilities.length - operational;
      const dcTier = grades.find((g) => g.regulationArea === DATA_CENTER_AREA)?.tier ?? 0;
      const graded = grades.filter((g) => g.tier > 0).length;

      await ctx.db.patch(state._id, {
        aiRegulation: {
          score: aiRegulationScore(grades.map((g) => g.tier), areas.length),
          summary: `Placeholder formula. ${graded} of ${areas.length} areas graded.`,
        },
        dataCenterPosture: {
          score: dataCenterPostureScore(dcTier, operational, planned),
          summary: `Placeholder formula. ${operational} operational, ${planned} planned sites; data center tier ${dcTier}.`,
        },
        verifiedAt: new Date().toISOString().slice(0, 10),
      });
    }
    return { states: states.length };
  },
});
