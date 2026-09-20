import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { state: v.optional(v.string()) },
  handler: (ctx, { state }) =>
    state
      ? ctx.db
          .query("stateRegulationAreaGrades")
          .withIndex("by_state", (q) => q.eq("state", state))
          .collect()
      : ctx.db.query("stateRegulationAreaGrades").collect(),
});
