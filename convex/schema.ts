import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Mirrors the local fixtures so Convex can become the backing store without
// changing the public API or frontend data shapes.
export default defineSchema({
  states: defineTable({
    code: v.string(),
    name: v.string(),
  }).index("by_code", ["code"]),
  bills: defineTable({
    bill_id: v.number(),
    number: v.string(),
    title: v.string(),
    status: v.number(),
    status_date: v.string(),
    last_action: v.string(),
    last_action_date: v.string(),
    url: v.string(),
    state: v.string(),
    chamber: v.string(),
    session: v.string(),
    product_status: v.union(v.literal("proposed"), v.literal("enacted")),
    raw: v.any(),
  }).index("by_state", ["state"]),
  datacenters: defineTable({
    external_id: v.string(),
    name: v.string(),
    state: v.string(),
    city: v.string(),
    capacity_mw: v.number(),
    status: v.string(),
    operator: v.string(),
    raw: v.any(),
  }).index("by_state", ["state"]),
});
