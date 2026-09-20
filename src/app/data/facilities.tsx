"use client";

import { useMemo, useState } from "react";
import { Table } from "./table";
import { Chips } from "./chips";

export type FacilityRow = {
  externalId: string;
  state: string;
  name: string;
  operator: string;
  status: string;
  capacityMw: number | null;
};

const STATUSES = [
  ["operational", "Operational"],
  ["under_construction", "Under construction"],
  ["proposed", "Proposed"],
] as const;

/** Facilities tab: status chips and a state chip row filter the table. */
export function Facilities({ rows }: { rows: FacilityRow[] }) {
  const [status, setStatus] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  const states = useMemo(() => [...new Set(rows.map((r) => r.state))].sort(), [rows]);
  const byStatus = useMemo(() => count(rows.filter((r) => !state || r.state === state), (r) => r.status), [rows, state]);
  const byState = useMemo(() => count(rows.filter((r) => !status || r.status === status), (r) => r.state), [rows, status]);
  const shown = rows.filter((r) => (!status || r.status === status) && (!state || r.state === state));

  return (
    <div className="flex flex-col gap-4">
      <Chips
        label="Status"
        options={STATUSES.map(([key, label]) => ({ key, label, count: byStatus[key] ?? 0 }))}
        active={status}
        onChange={setStatus}
        allCount={Object.values(byStatus).reduce((a, b) => a + b, 0)}
      />
      <Chips
        label="State"
        options={states.map((s) => ({ key: s, label: s, count: byState[s] ?? 0 }))}
        active={state}
        onChange={setState}
        allCount={Object.values(byState).reduce((a, b) => a + b, 0)}
      />
      <Table
        rows={shown}
        columns={["State", "Name", "Operator", "Status", "MW"]}
        render={(f) => [f.state, f.name, f.operator, f.status, f.capacityMw ?? "—"]}
      />
    </div>
  );
}

function count<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return out;
}
