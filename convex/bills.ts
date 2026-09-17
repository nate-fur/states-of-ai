import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, { state }) => {
    const rows = state
      ? await ctx.db.query("bills").withIndex("by_state", (q) => q.eq("state", state)).collect()
      : await ctx.db.query("bills").collect();
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  },
});
