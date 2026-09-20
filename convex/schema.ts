import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Mirrors docs/data-model.md. A state stores only judgment about itself;
// anything countable comes from facilities, bills, and grades at read time.

const axis = v.object({
  score: v.number(),
  summary: v.string(),
});

export const facilityStatus = v.union(
  v.literal("operational"),
  v.literal("under_construction"),
  v.literal("proposed"),
);

export const billStatus = v.union(
  v.literal("enacted"),
  v.literal("pending"),
  v.literal("proposed"),
);

/** One plain-English claim about a bill, citing the provisions that carry it. */
export const takeaway = v.object({
  title: v.string(), // under 8 words, a claim
  text: v.string(), // 1-2 sentences
  sectionIds: v.array(v.string()), // ids from src/lib/bill/parse.ts; empty only when the text has no structure
});

export default defineSchema({
  states: defineTable({
    code: v.string(),
    name: v.string(),
    // Both axes are derived from facilities, bills, and grades once those
    // exist; absent until then.
    dataCenterPosture: v.optional(axis), // score -3 restrict … +3 accelerate
    aiRegulation: v.optional(axis), // score 0 none … 6 comprehensive
    verifiedAt: v.optional(v.string()), // ISO date
  }).index("by_code", ["code"]),

  facilities: defineTable({
    externalId: v.string(),
    state: v.string(), // states.code
    name: v.string(),
    operator: v.string(),
    status: facilityStatus,
    capacityMw: v.union(v.number(), v.null()), // null when undisclosed
  })
    .index("by_state", ["state"])
    .index("by_external_id", ["externalId"]),

  bills: defineTable({
    externalId: v.string(),
    state: v.string(), // states.code
    number: v.string(), // "SB 53"
    title: v.string(), // LegiScan's title, verbatim
    status: billStatus,
    date: v.string(), // ISO date of that status
    url: v.string(),
    regulationAreas: v.array(v.string()), // regulationAreas.key[]; equals the set of billRegulationAreas rows
    session: v.string(), // e.g. "2025-2026 Regular Session"
    changeHash: v.string(), // LegiScan change_hash; skip the bill when unchanged
    textHash: v.string(), // LegiScan text_hash of the classified text
    shortTitle: v.string(), // classifier: 3-7 word noun phrase, shown in lists
    gist: v.string(), // classifier: 1-2 plain sentences
  })
    .index("by_state", ["state"])
    .index("by_external_id", ["externalId"]),

  // What one bill does for one regulation area: a one-line summary and the
  // takeaways the Bill Reader highlights. Written by the classifier.
  billRegulationAreas: defineTable({
    externalId: v.string(), // bills.externalId
    state: v.string(),
    regulationArea: v.string(), // regulationAreas.key
    summary: v.string(), // 1 sentence: how this bill moves this area in this state
    takeaways: v.array(takeaway), // 1-5, most important first
    textHash: v.string(), // text these were written against
    reviewedAt: v.optional(v.string()), // ISO date once a person has checked them
  })
    .index("by_external_id", ["externalId"])
    .index("by_state_area", ["state", "regulationArea"]),

  // Plain text of each saved bill, converted once from LegiScan's HTML or
  // PDF, so the classifier can be re-run without another LegiScan call.
  // The text itself lives in Convex file storage (no size cap); this row is
  // the pointer. Replaced when the bill's text hash changes.
  billTexts: defineTable({
    externalId: v.string(), // LegiScan bill_id
    state: v.string(),
    textHash: v.string(),
    mime: v.string(), // what LegiScan sent: text/html or application/pdf
    storageId: v.id("_storage"),
    chars: v.number(),
    sectionCount: v.optional(v.number()),
    subdivisionCount: v.optional(v.number()),
    wordCount: v.optional(v.number()),
    textDate: v.optional(v.string()), // LegiScan text entry date
    textType: v.optional(v.string()), // "Chaptered", "Enrolled", "Introduced", …
  })
    .index("by_external_id", ["externalId"])
    .index("by_state", ["state"]),

  // Bills the LegiScan job looked at and dropped (not about AI, vetoed or
  // failed, no text yet), keyed by change hash so later runs skip them for
  // free instead of fetching and classifying them again.
  legiscanSkips: defineTable({
    externalId: v.string(), // LegiScan bill_id
    state: v.string(),
    changeHash: v.string(),
    reason: v.string(),
  })
    .index("by_state", ["state"])
    .index("by_external_id", ["externalId"]),

  regulationAreas: defineTable({
    key: v.string(),
    label: v.string(),
    description: v.string(),
    icon: v.string(),
    rubric: v.array(v.string()), // 5 lines, index = tier 0…4; the tier agent grades against these
    order: v.number(), // grid position
  }).index("by_key", ["key"]),

  // One row per outside API per calendar month. The pipelines refuse to make
  // a call once `calls` reaches the cap, so a bug cannot burn the quota.
  apiUsage: defineTable({
    api: v.string(), // "legiscan" | "openai" | "computeAtlas"
    month: v.string(), // "YYYY-MM"
    calls: v.number(),
  }).index("by_api_month", ["api", "month"]),

  pipelineRuns: defineTable({
    job: v.string(),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    ok: v.optional(v.boolean()),
    summary: v.string(),
  }).index("by_job", ["job"]),

  stateRegulationAreaGrades: defineTable({
    state: v.string(), // states.code
    regulationArea: v.string(), // regulationAreas.key
    tier: v.number(), // 0 … 4
    note: v.string(), // 1 sentence: why this tier, naming the bills that earn it
    basisBillIds: v.array(v.string()), // bills.externalId of the enacted bills that set the tier
    gradedAt: v.string(), // ISO date
  })
    .index("by_state", ["state"])
    .index("by_regulation_area", ["regulationArea"]),
});
