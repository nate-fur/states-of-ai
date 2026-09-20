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

/**
 * Everything the bill panel and Bill Reader need for one bill: the bill,
 * its per-area summaries and takeaways, and a short-lived URL for the
 * stored plain text (null when no text is on file).
 */
export const detail = query({
  args: { state: v.string(), number: v.string() },
  handler: async (ctx, { state, number }) => {
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const bill = bills.find((b) => b.number === number) ?? null;
    if (!bill) return null;

    const areaRows = await ctx.db
      .query("billRegulationAreas")
      .withIndex("by_external_id", (q) => q.eq("externalId", bill.externalId))
      .collect();
    const textRow = await ctx.db
      .query("billTexts")
      .withIndex("by_external_id", (q) => q.eq("externalId", bill.externalId))
      .unique();
    const url = textRow ? await ctx.storage.getUrl(textRow.storageId) : null;

    return {
      bill,
      regulationAreas: areaRows.map((r) => ({
        regulationArea: r.regulationArea,
        summary: r.summary,
        takeaways: r.takeaways,
      })),
      text:
        textRow && url
          ? {
              url,
              textHash: textRow.textHash,
              mime: textRow.mime,
              sectionCount: textRow.sectionCount,
              subdivisionCount: textRow.subdivisionCount,
              wordCount: textRow.wordCount,
              textDate: textRow.textDate,
              textType: textRow.textType,
            }
          : null,
    };
  },
});
