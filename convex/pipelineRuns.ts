import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const start = internalMutation({
  args: { job: v.string(), summary: v.optional(v.string()) },
  handler: async (ctx, { job, summary = "" }) =>
    ctx.db.insert("pipelineRuns", { job, startedAt: Date.now(), summary }),
});

export const finish = internalMutation({
  args: { id: v.id("pipelineRuns"), ok: v.boolean(), summary: v.string() },
  handler: async (ctx, { id, ok, summary }) => {
    await ctx.db.patch(id, { finishedAt: Date.now(), ok, summary });
  },
});

/** Progress note while a run is still going. */
export const update = internalMutation({
  args: { id: v.id("pipelineRuns"), summary: v.string() },
  handler: async (ctx, { id, summary }) => {
    await ctx.db.patch(id, { summary });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pipelineRuns").collect();
    return rows.sort((a, b) => b.startedAt - a.startedAt).slice(0, 100);
  },
});
