import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Every outside HTTP call goes through `reserve` first. It counts the call
// against the current month and throws once the cap is hit, so a runaway
// loop stops itself instead of draining the quota.

export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export const reserve = internalMutation({
  args: { api: v.string(), cap: v.number(), n: v.optional(v.number()) },
  handler: async (ctx, { api, cap, n = 1 }) => {
    const month = currentMonth();
    const row = await ctx.db
      .query("apiUsage")
      .withIndex("by_api_month", (q) => q.eq("api", api).eq("month", month))
      .unique();
    const calls = row?.calls ?? 0;
    if (calls + n > cap) {
      throw new Error(`${api}: monthly cap of ${cap} calls reached (${calls} used in ${month})`);
    }
    if (row) await ctx.db.patch(row._id, { calls: calls + n });
    else await ctx.db.insert("apiUsage", { api, month, calls: n });
    return calls + n;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("apiUsage").collect();
    return rows.sort((a, b) => b.month.localeCompare(a.month) || a.api.localeCompare(b.api));
  },
});
