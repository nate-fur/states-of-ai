import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Step 9 of the bills job and step 5 of the facilities job (docs/pipeline.md).
// Both jobs call `recompute` with the states they touched.
//
// AI regulation is the average tier scaled to 0–6. Whether that rounding
// should change waits on a full bill run; the current grades cover a subset.
// Data center posture is unchanged for now.

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
        .query("stateRegulationAreaGrades")
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
          summary: `${graded} of ${areas.length} areas graded.`,
        },
        dataCenterPosture: {
          score: dataCenterPostureScore(dcTier, operational, planned),
          summary: `${operational} operational, ${planned} planned sites; data center tier ${dcTier}.`,
        },
        verifiedAt: new Date().toISOString().slice(0, 10),
      });
    }
    return { states: states.length };
  },
});
