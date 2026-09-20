"use client";

import { useMemo, useState } from "react";
import { Table } from "./table";
import { Chips, count } from "./chips";

export type BillRow = {
  externalId: string;
  state: string;
  number: string;
  title: string;
  status: string;
  date: string;
  url: string;
  regulationAreas: string[];
  shortTitle?: string;
  gist?: string;
};

const STATUSES = [
  ["enacted", "Enacted"],
  ["pending", "Pending"],
  ["proposed", "Proposed"],
] as const;

/** Bills tab: status, state, and area chips filter the table. */
export function Bills({ rows, areas }: { rows: BillRow[]; areas: { key: string; label: string }[] }) {
  const [status, setStatus] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);

  const states = useMemo(() => [...new Set(rows.map((r) => r.state))].sort(), [rows]);
  const match = (r: BillRow, skip: "status" | "state" | "area") =>
    (skip === "status" || !status || r.status === status) &&
    (skip === "state" || !state || r.state === state) &&
    (skip === "area" || !area || r.regulationAreas.includes(area));

  // Each chip row counts against the other two filters, so numbers stay honest.
  const byStatus = count(rows.filter((r) => match(r, "status")), (r) => [r.status]);
  const byState = count(rows.filter((r) => match(r, "state")), (r) => [r.state]);
  const byArea = count(rows.filter((r) => match(r, "area")), (r) => r.regulationAreas);
  const shown = rows.filter((r) => match(r, "status") && match(r, "state") && match(r, "area"));
  const total = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <Chips
        label="Status"
        options={STATUSES.map(([key, label]) => ({ key, label, count: byStatus[key] ?? 0 }))}
        active={status}
        onChange={setStatus}
        allCount={total(byStatus)}
      />
      <Chips
        label="Area"
        options={areas.map((c) => ({ key: c.key, label: c.label, count: byArea[c.key] ?? 0 }))}
        active={area}
        onChange={setArea}
        allCount={rows.filter((r) => match(r, "area")).length}
      />
      <Chips
        label="State"
        options={states.map((s) => ({ key: s, label: s, count: byState[s] ?? 0 }))}
        active={state}
        onChange={setState}
        allCount={total(byState)}
      />
      <Table
        rows={shown}
        columns={["State", "Number", "Title", "Gist", "Status", "Date", "Areas"]}
        render={(b) => [
          b.state,
          <a key="n" href={b.url} target="_blank" rel="noreferrer" className="text-ink underline decoration-hair underline-offset-2 hover:decoration-ink">
            {b.number}
          </a>,
          <span key="t" className="flex flex-col gap-0.5">
            <span>{b.shortTitle || b.title}</span>
            {b.shortTitle && <span className="text-[12px] text-mute">{b.title}</span>}
          </span>,
          b.gist ?? "",
          b.status,
          b.date,
          b.regulationAreas.join(", "),
        ]}
      />
    </div>
  );
}
