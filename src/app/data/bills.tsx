"use client";

import { useMemo, useState } from "react";
import { Table } from "./table";

export type BillRow = {
  externalId: string;
  state: string;
  number: string;
  title: string;
  status: string;
  date: string;
  url: string;
  regulationAreas: string[];
  summary?: string;
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
        columns={["State", "Number", "Title", "Status", "Date", "Areas"]}
        render={(b) => [
          b.state,
          <a key="n" href={b.url} target="_blank" rel="noreferrer" className="text-ink underline decoration-hair underline-offset-2 hover:decoration-ink">
            {b.number}
          </a>,
          b.title,
          b.status,
          b.date,
          b.regulationAreas.join(", "),
        ]}
      />
    </div>
  );
}

function count<T>(rows: T[], keys: (r: T) => string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) for (const k of keys(r)) out[k] = (out[k] ?? 0) + 1;
  return out;
}

function Chips({
  label,
  options,
  active,
  onChange,
  allCount,
}: {
  label: string;
  options: { key: string; label: string; count: number }[];
  active: string | null;
  onChange: (key: string | null) => void;
  allCount: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5 font-map-mono text-[11px]">
      <span className="mr-1 uppercase tracking-[0.1em] text-mute">{label}</span>
      <Chip label="All" count={allCount} active={active === null} onClick={() => onChange(null)} />
      {options.map((o) => (
        <Chip
          key={o.key}
          label={o.label}
          count={o.count}
          active={active === o.key}
          onClick={() => onChange(active === o.key ? null : o.key)}
        />
      ))}
    </div>
  );
}

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-baseline gap-1.5 border px-2 py-[3px] ${
        active ? "border-ink bg-ink text-white" : "border-hair bg-transparent text-ink hover:border-ink"
      } ${count === 0 && !active ? "text-dim" : ""}`}
    >
      <span>{label}</span>
      <span className={active ? "text-white/60" : "text-dim"}>{count}</span>
    </button>
  );
}
