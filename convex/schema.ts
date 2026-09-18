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
    title: v.string(),
    status: billStatus,
    date: v.string(), // ISO date of that status
    url: v.string(),
    categories: v.array(v.string()), // regulationCategories.key[]
    session: v.string(), // e.g. "2025-2026 Regular Session"
    changeHash: v.string(), // LegiScan change_hash; skip the bill when unchanged
    textHash: v.string(), // LegiScan text_hash of the classified text
    summary: v.string(), // written by the classifier
    keyPoints: v.array(v.string()), // written by the classifier
  })
    .index("by_state", ["state"])
    .index("by_external_id", ["externalId"]),

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

  regulationCategories: defineTable({
    key: v.string(),
    label: v.string(),
    description: v.string(),
    icon: v.string(),
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

  stateCategoryGrades: defineTable({
    state: v.string(), // states.code
    category: v.string(), // regulationCategories.key
    tier: v.number(), // 0 … 4
  })
    .index("by_state", ["state"])
    .index("by_category", ["category"]),
});
