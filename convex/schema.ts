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
  })
    .index("by_state", ["state"])
    .index("by_external_id", ["externalId"]),

  regulationCategories: defineTable({
    key: v.string(),
    label: v.string(),
    description: v.string(),
    icon: v.string(),
  }).index("by_key", ["key"]),

  stateCategoryGrades: defineTable({
    state: v.string(), // states.code
    category: v.string(), // regulationCategories.key
    tier: v.number(), // 0 … 4
  })
    .index("by_state", ["state"])
    .index("by_category", ["category"]),
});
