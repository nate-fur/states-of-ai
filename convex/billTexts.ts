import { query } from "./_generated/server";

/** Pointer rows for every stored bill text, without the storage id. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("billTexts").collect();
    return rows.map((r) => ({
      externalId: r.externalId,
      state: r.state,
      textHash: r.textHash,
      mime: r.mime,
      chars: r.chars,
      sectionCount: r.sectionCount,
      subdivisionCount: r.subdivisionCount,
      wordCount: r.wordCount,
      textDate: r.textDate,
      textType: r.textType,
    }));
  },
});
