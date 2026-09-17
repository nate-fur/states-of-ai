import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public product query. Returned records retain raw LegiScan-style fields,
 * while the indexed columns make state filtering efficient.
 */
export const list = query({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = args.state
      ? await ctx.db
          .query("bills")
          .withIndex("by_state", (index) => index.eq("state", args.state!))
          .collect()
      : await ctx.db.query("bills").collect();

    return rows
      .map((row) => row.raw)
      .sort((first, second) =>
        String(second.last_action_date).localeCompare(String(first.last_action_date)),
      );
  },
});
