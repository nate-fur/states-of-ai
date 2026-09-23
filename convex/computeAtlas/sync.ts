import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, type ActionCtx } from "../_generated/server";
import { facilityStatus } from "../schema";
import { envNumber, pipelinesEnabled } from "../pipelines";
import { mapFacilities, recordsFrom, type FacilityRow } from "./map";

// Compute Atlas facilities job (docs/pipeline.md, "Compute Atlas facilities").
// One call returns every US data center, so each run replaces the whole
// facilities table, matched on the Compute Atlas id.

const FACILITIES_URL = "https://www.compute-atlas.com/api/facilities";
const STATS_URL = "https://www.compute-atlas.com/api/stats";
const USER_AGENT = "states-of-ai/0.1";
const JOB = "computeAtlas";
const CHUNK = 200; // rows per upsert mutation; keeps each transaction small

type Summary = {
  edition: string | null;
  fetched: number;
  kept: number;
  inserted: number;
  updated: number;
  deleted: number;
  statesTouched: number;
  byStatus: { operational: number; under_construction: number; proposed: number };
  dropped: { not_data_center: number; cancelled: number; unknown_status: number; no_state: number };
  dryRun: boolean;
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} returned ${res.status} ${res.statusText}`);
  return res.json();
}

export const run = internalAction({
  args: {
    dryRun: v.optional(v.boolean()), // fetch and map, but write nothing
    force: v.optional(v.boolean()), // bypass the PIPELINES_ENABLED gate for manual runs
  },
  handler: async (ctx, { dryRun = false, force = false }): Promise<Summary | null> => {
    if (!force && !pipelinesEnabled()) {
      console.log("computeAtlas: PIPELINES_ENABLED is not true; skipping");
      return null;
    }

    const runId = await ctx.runMutation(internal.pipelineRuns.start, { job: JOB });
    try {
      const summary = await sync(ctx, dryRun);
      await ctx.runMutation(internal.pipelineRuns.finish, { id: runId, ok: true, summary: describe(summary) });
      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.pipelineRuns.finish, { id: runId, ok: false, summary: message });
      throw err;
    }
  },
});

async function sync(ctx: ActionCtx, dryRun: boolean): Promise<Summary> {
  const cap = envNumber("COMPUTE_ATLAS_MONTHLY_CAP", 100);

  // Step 1: fetch the edition stamp and the full list. Each HTTP call is
  // reserved against the monthly cap first.
  await ctx.runMutation(internal.apiUsage.reserve, { api: JOB, cap });
  const stats = (await getJson(STATS_URL)) as { edition?: unknown };
  const edition = typeof stats?.edition === "string" ? stats.edition : null;

  await ctx.runMutation(internal.apiUsage.reserve, { api: JOB, cap });
  const records = recordsFrom(await getJson(FACILITIES_URL));

  // Steps 2 and 3: filter and map.
  const mapped = mapFacilities(records);

  const summary: Summary = {
    edition,
    fetched: records.length,
    kept: mapped.rows.length,
    inserted: 0,
    updated: 0,
    deleted: 0,
    statesTouched: 0,
    byStatus: mapped.byStatus,
    dropped: mapped.dropped,
    dryRun,
  };
  if (dryRun) return summary;

  // Step 4: replace the table, in chunks, then drop anything no longer listed.
  const touched = new Set<string>();
  for (let i = 0; i < mapped.rows.length; i += CHUNK) {
    const result = await ctx.runMutation(internal.computeAtlas.sync.upsertChunk, {
      rows: mapped.rows.slice(i, i + CHUNK),
    });
    summary.inserted += result.inserted;
    summary.updated += result.updated;
    for (const s of result.states) touched.add(s);
  }
  const removed = await ctx.runMutation(internal.computeAtlas.sync.deleteMissing, {
    keep: mapped.rows.map((r) => r.externalId),
  });
  summary.deleted = removed.deleted;
  for (const s of removed.states) touched.add(s);

  // Steps 5 and 6: rescore only the states whose facilities changed.
  summary.statesTouched = touched.size;
  if (touched.size > 0) {
    await ctx.runMutation(internal.scores.recompute, { states: [...touched].sort() });
  }
  return summary;
}

function describe(s: Summary): string {
  const b = s.byStatus;
  return (
    `edition ${s.edition ?? "unknown"}; fetched ${s.fetched}, kept ${s.kept} ` +
    `(${b.operational} operational, ${b.under_construction} under construction, ${b.proposed} proposed); ` +
    `dropped ${s.dropped.cancelled} cancelled; ` +
    (s.dryRun
      ? "dry run, nothing written"
      : `inserted ${s.inserted}, updated ${s.updated}, deleted ${s.deleted}; rescored ${s.statesTouched} states`)
  );
}

const facilityRow = v.object({
  externalId: v.string(),
  state: v.string(),
  name: v.string(),
  operator: v.string(),
  status: facilityStatus,
  capacityMw: v.union(v.number(), v.null()),
});

/** Insert or update a chunk of rows, keyed on externalId. Returns the states it changed. */
export const upsertChunk = internalMutation({
  args: { rows: v.array(facilityRow) },
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    const states = new Set<string>();

    for (const row of rows) {
      const existing = await ctx.db
        .query("facilities")
        .withIndex("by_external_id", (q) => q.eq("externalId", row.externalId))
        .unique();

      if (!existing) {
        await ctx.db.insert("facilities", row);
        inserted++;
        states.add(row.state);
      } else if (!sameRow(existing, row)) {
        await ctx.db.replace(existing._id, row);
        updated++;
        states.add(existing.state); // a facility can move states; rescore both
        states.add(row.state);
      }
    }
    return { inserted, updated, states: [...states] };
  },
});

function sameRow(a: FacilityRow, b: FacilityRow): boolean {
  return (
    a.state === b.state &&
    a.name === b.name &&
    a.operator === b.operator &&
    a.status === b.status &&
    a.capacityMw === b.capacityMw
  );
}

/** Delete every facility whose externalId is not in `keep`. Returns the states it changed. */
export const deleteMissing = internalMutation({
  args: { keep: v.array(v.string()) },
  handler: async (ctx, { keep }) => {
    const keepSet = new Set(keep);
    const states = new Set<string>();
    let deleted = 0;

    for (const row of await ctx.db.query("facilities").collect()) {
      if (keepSet.has(row.externalId)) continue;
      await ctx.db.delete(row._id);
      deleted++;
      states.add(row.state);
    }
    return { deleted, states: [...states] };
  },
});
