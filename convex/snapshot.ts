import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

// The tables the site renders. Preview deployments copy these from
// production through `page` (see seed.ts `fromSource`). Pipeline bookkeeping
// (billTexts, legiscanSkips, apiUsage, pipelineRuns) stays out.
export const SNAPSHOT_TABLES = [
  "states",
  "regulationAreas",
  "facilities",
  "bills",
  "billRegulationAreas",
  "stateRegulationAreaGrades",
] as const;

export const snapshotTable = v.union(...SNAPSHOT_TABLES.map((t) => v.literal(t)));

const MAX_PAGE = 500;

/** One page of a public table, raw rows. Everything here is already on the site. */
export const page = query({
  args: { table: snapshotTable, paginationOpts: paginationOptsValidator },
  handler: (ctx, { table, paginationOpts }) =>
    ctx.db
      .query(table)
      .paginate({ ...paginationOpts, numItems: Math.min(paginationOpts.numItems, MAX_PAGE) }),
});
