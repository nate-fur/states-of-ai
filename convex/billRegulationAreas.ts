import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, { state }) => {
    if (!state) return ctx.db.query("billRegulationAreas").collect();
    return ctx.db
      .query("billRegulationAreas")
      .withIndex("by_state_area", (q) => q.eq("state", state))
      .collect();
  },
});

/** One line per bill x area, without the takeaway text, for the map. */
export const summaries = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("billRegulationAreas").collect();
    return rows.map((r) => ({
      externalId: r.externalId,
      state: r.state,
      regulationArea: r.regulationArea,
      summary: r.summary,
      takeawayCount: r.takeaways.length,
    }));
  },
});
