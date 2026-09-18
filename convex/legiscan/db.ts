import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "../_generated/server";
import { billStatus } from "../schema";

// Database access for the LegiScan pipeline. Actions cannot touch ctx.db, so
// sync.ts goes through these.

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

/** Store (or replace) the plain text of a bill. */
export const saveBillText = internalMutation({
  args: {
    externalId: v.string(),
    state: v.string(),
    textHash: v.string(),
    mime: v.string(),
    storageId: v.id("_storage"),
    chars: v.number(),
  },
  handler: async (ctx, row) => {
    const existing = await ctx.db
      .query("billTexts")
      .withIndex("by_external_id", (q) => q.eq("externalId", row.externalId))
      .unique();
    if (existing) {
      await ctx.db.replace(existing._id, row);
      if (existing.storageId !== row.storageId) await ctx.storage.delete(existing.storageId);
    } else {
      await ctx.db.insert("billTexts", row);
    }
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
      const t = await ctx.db
        .query("billTexts")
        .withIndex("by_external_id", (q) => q.eq("externalId", b.externalId))
        .unique();
      out.push({
        externalId: b.externalId,
        number: b.number,
        title: b.title,
        status: b.status,
        session: b.session,
        regulationAreas: b.regulationAreas,
        changeHash: b.changeHash,
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

/** Update only what the classifier decides. */
export const patchClassification = internalMutation({
  args: { externalId: v.string(), regulationAreas: v.array(v.string()), summary: v.string(), keyPoints: v.array(v.string()) },
  handler: async (ctx, { externalId, ...patch }) => {
    const existing = await findBill(ctx, externalId);
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

/** Areas that currently have at least one saved bill in a state. */
export const gradedAreas = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const bills = await ctx.db.query("bills").withIndex("by_state", (q) => q.eq("state", state)).collect();
    const grades = await ctx.db.query("stateAreaGrades").withIndex("by_state", (q) => q.eq("state", state)).collect();
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
    return rows.map((r) => ({ key: r.key, label: r.label, description: r.description }));
  },
});

/** All of a state's saved bills tagged with one area, for the tier agent. */
export const billsForArea = internalQuery({
  args: { state: v.string(), area: v.string() },
  handler: async (ctx, { state, area }) => {
    const rows = await ctx.db
      .query("bills")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    return rows
      .filter((r) => r.regulationAreas.includes(area))
      .map((r) => ({
        number: r.number,
        title: r.title,
        status: r.status,
        date: r.date,
        session: r.session,
        summary: r.summary,
        keyPoints: r.keyPoints,
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
  regulationAreas: v.array(v.string()),
  session: v.string(),
  changeHash: v.string(),
  textHash: v.string(),
  summary: v.string(),
  keyPoints: v.array(v.string()),
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

export const upsertBill = internalMutation({
  args: billFields,
  handler: async (ctx, bill) => {
    const existing = await findBill(ctx, bill.externalId);
    if (existing) await ctx.db.replace(existing._id, bill);
    else await ctx.db.insert("bills", bill);
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

export const deleteBill = internalMutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const existing = await findBill(ctx, externalId);
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const upsertGrade = internalMutation({
  args: { state: v.string(), area: v.string(), tier: v.number() },
  handler: async (ctx, { state, area, tier }) => {
    const rows = await ctx.db
      .query("stateAreaGrades")
      .withIndex("by_state", (q) => q.eq("state", state))
      .collect();
    const existing = rows.find((r) => r.regulationArea === area);
    if (existing) await ctx.db.patch(existing._id, { tier });
    else await ctx.db.insert("stateAreaGrades", { state, regulationArea: area, tier });
  },
});
