import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { AREAS, STATES } from "./seedData";

const TABLES = [
  "states",
  "facilities",
  "bills",
  "billRegulationAreas",
  "billTexts",
  "legiscanSkips",
  "regulationAreas",
  "stateRegulationAreaGrades",
] as const;
type Table = (typeof TABLES)[number];

async function clearTable(ctx: MutationCtx, table: Table) {
  const rows = await ctx.db.query(table).collect();
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
}

/** Replace states and regulation areas with the committed seed. Empties every other table. */
export const fixtures = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of TABLES) await clearTable(ctx, table);
    await Promise.all(STATES.map((s) => ctx.db.insert("states", s)));
    await Promise.all(AREAS.map((c) => ctx.db.insert("regulationAreas", { ...c, rubric: [...c.rubric] })));
    return { states: STATES.length, regulationAreas: AREAS.length };
  },
});

/** Replace any subset of tables from a pipeline document keyed by table name. */
export const importDocument = mutation({
  args: { document: v.any() },
  handler: async (ctx, { document }) => {
    const counts: Record<string, number> = {};
    for (const table of TABLES) {
      const rows = document[table];
      if (!Array.isArray(rows)) continue;
      await clearTable(ctx, table);
      await Promise.all(rows.map((row: Record<string, unknown>) => ctx.db.insert(table, row as never)));
      counts[table] = rows.length;
    }
    return counts;
  },
});
