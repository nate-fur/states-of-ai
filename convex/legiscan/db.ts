import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import { billStatus, takeaway } from "../schema";
import type { TierBill } from "./tier";

// Database access for the LegiScan pipeline. Actions cannot touch ctx.db, so
// sync.ts and rerun.ts go through these.

/** Saved bills for a state, keyed by LegiScan bill_id, for the hash compare. */
export const savedBills = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const rows = await ctx.db
      .query("bills")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const map: Record<
      string,
      { changeHash: string; textHash: string; status: string; regulationAreas: string[] }
    > = {};
    for (const r of rows) {
      map[r.externalId] = {
        changeHash: r.changeHash,
        textHash: r.textHash,
        status: r.status,
        regulationAreas: r.regulationAreas,
      };
    }
    return map;
  },
});

/** Dropped bills for a state, keyed by LegiScan bill_id -> change hash. */
export const skippedBills = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const rows = await ctx.db
      .query("legiscanSkips")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.externalId] = r.changeHash;
    return map;
  },
});

/** Remember a dropped bill so the next run skips it until its change hash moves. */
export const rememberSkip = internalMutation({
  args: { externalId: v.string(), state: v.string(), changeHash: v.string(), reason: v.string() },
  handler: async (ctx, skip) => {
    const existing = await findSkip(ctx, skip.externalId);
    if (existing) await ctx.db.replace(existing._id, skip);
    else await ctx.db.insert("legiscanSkips", skip);
  },
});

const textCounts = {
  sectionCount: v.number(),
  subdivisionCount: v.number(),
  wordCount: v.number(),
};

/** Store (or replace) the plain text of a bill. */
export const saveBillText = internalMutation({
  args: {
    externalId: v.string(),
    state: v.string(),
    textHash: v.string(),
    mime: v.string(),
    storageId: v.id("_storage"),
    chars: v.number(),
    ...textCounts,
    textDate: v.string(),
    textType: v.string(),
  },
  handler: async (ctx, row) => {
    const existing = await findText(ctx, row.externalId);
    if (existing) {
      await ctx.db.replace(existing._id, row);
      if (existing.storageId !== row.storageId) await ctx.storage.delete(existing.storageId);
    } else {
      await ctx.db.insert("billTexts", row);
    }
  },
});

/** Backfill the parse counts on a stored text (reclassify reads the text anyway). */
export const patchTextCounts = internalMutation({
  args: { externalId: v.string(), ...textCounts },
  handler: async (ctx, { externalId, ...counts }) => {
    const existing = await findText(ctx, externalId);
    if (existing) await ctx.db.patch(existing._id, counts);
  },
});

/** Saved bills of a state with their stored text, for re-classification. */
export const billsWithText = internalQuery({
  args: { state: v.string(), externalIds: v.array(v.string()) },
  handler: async (ctx, { state, externalIds }) => {
    const want = new Set(externalIds);
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const out = [];
    for (const b of bills) {
      if (!want.has(b.externalId)) continue;
      const t = await findText(ctx, b.externalId);
      out.push({
        externalId: b.externalId,
        number: b.number,
        title: b.title,
        status: b.status,
        session: b.session,
        regulationAreas: b.regulationAreas,
        changeHash: b.changeHash,
        textHash: t?.textHash ?? b.textHash,
        storageId: t?.storageId ?? null,
      });
    }
    return out;
  },
});

/** Every saved bill id for a state (or all states), for queuing a re-run. */
export const billIds = internalQuery({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, { state }) => {
    const rows = state
      ? await ctx.db.query("bills").withIndex("by_state", (q) => q.eq("state", state)).collect()
      : await ctx.db.query("bills").collect();
    return rows.map((r) => ({ state: r.state, externalId: r.externalId }));
  },
});

const areaResult = v.object({
  key: v.string(),
  summary: v.string(),
  takeaways: v.array(takeaway),
});
type AreaResult = (typeof areaResult)["type"];

/**
 * Save what the classifier decided about a saved bill: the bill's own
 * fields plus one billRegulationAreas row per area (old rows replaced).
 */
export const saveClassification = internalMutation({
  args: {
    externalId: v.string(),
    state: v.string(),
    textHash: v.string(),
    shortTitle: v.string(),
    gist: v.string(),
    regulationAreas: v.array(areaResult),
  },
  handler: async (ctx, { externalId, state, textHash, shortTitle, gist, regulationAreas }) => {
    const existing = await findBill(ctx, externalId);
    if (existing) {
      await ctx.db.patch(existing._id, { shortTitle, gist, regulationAreas: regulationAreas.map((a) => a.key) });
    }
    await replaceBillAreas(ctx, { externalId, state, textHash, regulationAreas });
  },
});

async function replaceBillAreas(
  ctx: MutationCtx,
  args: { externalId: string; state: string; textHash: string; regulationAreas: AreaResult[] },
) {
  const old = await ctx.db
    .query("billRegulationAreas")
    .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
    .collect();
  await Promise.all(old.map((r) => ctx.db.delete(r._id)));
  for (const a of args.regulationAreas) {
    await ctx.db.insert("billRegulationAreas", {
      externalId: args.externalId,
      state: args.state,
      regulationArea: a.key,
      summary: a.summary,
      takeaways: a.takeaways,
      textHash: args.textHash,
    });
  }
}

/** Areas that currently have at least one saved bill in a state. */
export const gradedAreas = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const bills = await ctx.db.query("bills").withIndex("by_state", (q) => q.eq("state", state)).collect();
    const grades = await ctx.db
      .query("stateRegulationAreaGrades")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const keys = new Set<string>();
    for (const b of bills) b.regulationAreas.forEach((k) => keys.add(k));
    for (const g of grades) keys.add(g.regulationArea); // re-grade to 0 if its bills went away
    return [...keys];
  },
});

export const areas = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("regulationAreas").collect();
    return rows
      .sort((a, b) => a.order - b.order)
      .map((r) => ({ key: r.key, label: r.label, description: r.description, rubric: r.rubric }));
  },
});

/** All of a state's saved bills tagged with one area, with that area's summary and takeaways, for the tier agent. */
export const billsForArea = internalQuery({
  args: { state: v.string(), regulationArea: v.string() },
  handler: async (ctx, { state, regulationArea }): Promise<TierBill[]> => {
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const areaRows = await ctx.db
      .query("billRegulationAreas")
      .withIndex("by_state_area", (q) => q.eq("state", state).eq("regulationArea", regulationArea))
      .collect();
    const byBill = new Map(areaRows.map((r) => [r.externalId, r]));
    return bills
      .filter((r) => r.regulationAreas.includes(regulationArea))
      .map((r) => ({
        externalId: r.externalId,
        number: r.number,
        title: r.title,
        shortTitle: r.shortTitle,
        status: r.status,
        date: r.date,
        session: r.session,
        summary: byBill.get(r.externalId)?.summary ?? r.gist,
        takeaways: byBill.get(r.externalId)?.takeaways ?? [],
      }));
  },
});

const billFields = {
  externalId: v.string(),
  state: v.string(),
  number: v.string(),
  title: v.string(),
  status: billStatus,
  date: v.string(),
  url: v.string(),
  session: v.string(),
  changeHash: v.string(),
  textHash: v.string(),
  shortTitle: v.string(),
  gist: v.string(),
};

function findSkip(ctx: MutationCtx, externalId: string) {
  return ctx.db
    .query("legiscanSkips")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique();
}

function findBill(ctx: MutationCtx, externalId: string) {
  return ctx.db
    .query("bills")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique();
}

function findText(ctx: QueryCtx | MutationCtx, externalId: string) {
  return ctx.db
    .query("billTexts")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique();
}

/** Insert or replace a bill together with its per-area rows. */
export const upsertBill = internalMutation({
  args: { ...billFields, regulationAreas: v.array(areaResult) },
  handler: async (ctx, { regulationAreas, ...bill }) => {
    const row = { ...bill, regulationAreas: regulationAreas.map((a) => a.key) };
    const existing = await findBill(ctx, bill.externalId);
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("bills", row);
    await replaceBillAreas(ctx, { externalId: bill.externalId, state: bill.state, textHash: bill.textHash, regulationAreas });
    // A bill that was skipped before but is relevant now is no longer a skip.
    const skip = await findSkip(ctx, bill.externalId);
    if (skip) await ctx.db.delete(skip._id);
  },
});

/** Text unchanged: refresh status and metadata, keep the classifier output. */
export const patchBillStatus = internalMutation({
  args: {
    externalId: v.string(),
    number: v.string(),
    title: v.string(),
    status: billStatus,
    date: v.string(),
    url: v.string(),
    session: v.string(),
    changeHash: v.string(),
  },
  handler: async (ctx, { externalId, ...patch }) => {
    const existing = await findBill(ctx, externalId);
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

/** Remove a bill and its per-area rows. The stored text stays until the next text arrives. */
export const deleteBill = internalMutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const existing = await findBill(ctx, externalId);
    if (existing) await ctx.db.delete(existing._id);
    await replaceBillAreas(ctx, { externalId, state: "", textHash: "", regulationAreas: [] });
  },
});

export const upsertGrade = internalMutation({
  args: {
    state: v.string(),
    regulationArea: v.string(),
    tier: v.number(),
    note: v.string(),
    basisBillIds: v.array(v.string()),
    elements: v.array(v.string()),
  },
  handler: async (ctx, grade) => {
    const gradedAt = new Date().toISOString().slice(0, 10);
    const rows = await ctx.db
      .query("stateRegulationAreaGrades")
      .withIndex("by_state", (q) => q.eq("state", grade.state))
      .collect();
    const existing = rows.find((r) => r.regulationArea === grade.regulationArea);
    if (existing) await ctx.db.patch(existing._id, { ...grade, gradedAt });
    else await ctx.db.insert("stateRegulationAreaGrades", { ...grade, gradedAt });
  },
});
