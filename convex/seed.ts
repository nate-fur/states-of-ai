import { ConvexHttpClient } from "convex/browser";
import type { PaginationResult } from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalAction, internalMutation, type MutationCtx } from "./_generated/server";
import { AREAS, STATES } from "./seedData";
import { SNAPSHOT_TABLES, snapshotTable } from "./snapshot";

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
export const fixtures = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of TABLES) await clearTable(ctx, table);
    await Promise.all(STATES.map((s) => ctx.db.insert("states", s)));
    await Promise.all(AREAS.map((c) => ctx.db.insert("regulationAreas", { ...c, rubric: [...c.rubric] })));
    return { states: STATES.length, regulationAreas: AREAS.length };
  },
});

/** Replace any subset of tables from a pipeline document keyed by table name. */
export const importDocument = internalMutation({
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

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of TABLES) await clearTable(ctx, table);
  },
});

export const insertRows = internalMutation({
  args: { table: snapshotTable, rows: v.array(v.any()) },
  handler: async (ctx, { table, rows }) => {
    await Promise.all(rows.map((row) => ctx.db.insert(table, row as never)));
  },
});

const PAGE_SIZE = 500;

/**
 * Preview seed: copy the site's tables from the deployment at
 * SEED_SOURCE_URL (production, set as a Convex default env var for previews)
 * through its public `snapshot:page` query. Falls back to `fixtures` when the
 * URL is unset or the source can't be read, so a preview build never fails
 * on it. Bill texts are not copied.
 */
export const fromSource = internalAction({
  args: {},
  handler: async (ctx): Promise<Record<string, number>> => {
    const url = process.env.SEED_SOURCE_URL;
    if (!url) {
      console.log("seed: SEED_SOURCE_URL is not set; using fixtures");
      return await ctx.runMutation(internal.seed.fixtures, {});
    }

    // Read everything before touching this deployment, so a failed read
    // leaves a clean fixture seed rather than half a copy.
    const snapshot: { table: (typeof SNAPSHOT_TABLES)[number]; rows: Record<string, unknown>[] }[] = [];
    try {
      const source = new ConvexHttpClient(url); // throws on a malformed URL
      for (const table of SNAPSHOT_TABLES) {
        const rows: Record<string, unknown>[] = [];
        let cursor: string | null = null;
        for (;;) {
          const result: PaginationResult<Record<string, unknown>> = await source.query(api.snapshot.page, {
            table,
            paginationOpts: { numItems: PAGE_SIZE, cursor },
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for (const { _id, _creationTime, ...row } of result.page) rows.push(row);
          if (result.isDone) break;
          cursor = result.continueCursor;
        }
        snapshot.push({ table, rows });
      }
    } catch (error) {
      console.log(`seed: could not read ${url} (${String(error)}); using fixtures`);
      return await ctx.runMutation(internal.seed.fixtures, {});
    }

    // Source rows can fail this branch's schema. Fall back rather than leave
    // a partial copy; `fixtures` clears whatever was written.
    const counts: Record<string, number> = {};
    try {
      await ctx.runMutation(internal.seed.clearAll, {});
      for (const { table, rows } of snapshot) {
        for (let i = 0; i < rows.length; i += PAGE_SIZE) {
          await ctx.runMutation(internal.seed.insertRows, { table, rows: rows.slice(i, i + PAGE_SIZE) });
        }
        counts[table] = rows.length;
      }
    } catch (error) {
      console.log(`seed: could not write the copy (${String(error)}); using fixtures`);
      return await ctx.runMutation(internal.seed.fixtures, {});
    }
    console.log(`seed: copied from ${url}`, counts);
    return counts;
  },
});
