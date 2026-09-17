import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("states").collect(),
});

export const get = query({
  args: { code: v.string() },
  handler: (ctx, { code }) =>
    ctx.db.query("states").withIndex("by_code", (q) => q.eq("code", code)).unique(),
});
