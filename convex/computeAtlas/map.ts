// Pure mapping from Compute Atlas API records to rows in our `facilities`
// table. No Convex imports so it can be tested with a plain script.

export type ComputeAtlasRecord = {
  id: string;
  name: string;
  operator?: string | null;
  status: string;
  facilityType?: string;
  location?: { state?: string | null };
  capacityMw?: { operational?: number | null; planned?: number | null } | null;
};

export type FacilityStatus = "operational" | "under_construction" | "proposed";

/** One row of the `facilities` table, minus Convex's system fields. */
export type FacilityRow = {
  externalId: string;
  state: string;
  name: string;
  operator: string;
  status: FacilityStatus;
  capacityMw: number | null;
};

/** The API has returned both a bare array and `{ facilities: [...] }`; accept either. */
export function recordsFrom(payload: unknown): ComputeAtlasRecord[] {
  if (Array.isArray(payload)) return payload as ComputeAtlasRecord[];
  if (payload && typeof payload === "object") {
    const list = (payload as { facilities?: unknown }).facilities;
    if (Array.isArray(list)) return list as ComputeAtlasRecord[];
  }
  throw new Error("Compute Atlas payload is neither an array nor { facilities: [] }");
}

// Compute Atlas has five statuses; our model has three. "permitted" folds
// into "proposed" and "cancelled" is dropped.
const STATUS: Record<string, FacilityStatus> = {
  operational: "operational",
  under_construction: "under_construction",
  permitted: "proposed",
  proposed: "proposed",
};

export type DropReason = "not_data_center" | "cancelled" | "unknown_status" | "no_state";

/** Why a record was not kept, or null when it maps cleanly. */
export function dropReason(record: ComputeAtlasRecord): DropReason | null {
  if (record.facilityType !== "data_center") return "not_data_center";
  if (record.status === "cancelled") return "cancelled";
  if (!(record.status in STATUS)) return "unknown_status";
  if (!record.location?.state) return "no_state";
  return null;
}

/** Map one API record to a facilities row, or null if it should be skipped. */
export function toFacility(record: ComputeAtlasRecord): FacilityRow | null {
  if (dropReason(record) !== null) return null;
  const status = STATUS[record.status];
  const state = record.location!.state!.toUpperCase();

  // Operational sites report what is running; everything else reports the plan.
  const cap = record.capacityMw ?? {};
  const mw = status === "operational" ? cap.operational : cap.planned;
  const capacityMw = typeof mw === "number" && Number.isFinite(mw) ? mw : null;

  return {
    externalId: record.id,
    state,
    name: record.name,
    operator: record.operator ?? "",
    status,
    capacityMw,
  };
}

export type MapResult = {
  rows: FacilityRow[];
  byStatus: Record<FacilityStatus, number>;
  dropped: Record<DropReason, number>;
};

/** Map a whole payload and tally what was kept and what was dropped. */
export function mapFacilities(records: ComputeAtlasRecord[]): MapResult {
  const rows: FacilityRow[] = [];
  const byStatus: Record<FacilityStatus, number> = { operational: 0, under_construction: 0, proposed: 0 };
  const dropped: Record<DropReason, number> = { not_data_center: 0, cancelled: 0, unknown_status: 0, no_state: 0 };
  const seen = new Set<string>();

  for (const record of records) {
    const reason = dropReason(record);
    if (reason) {
      dropped[reason]++;
      continue;
    }
    const row = toFacility(record)!;
    // The upsert keys on externalId, so a duplicate id would just overwrite itself.
    if (seen.has(row.externalId)) continue;
    seen.add(row.externalId);
    rows.push(row);
    byStatus[row.status]++;
  }
  return { rows, byStatus, dropped };
}
