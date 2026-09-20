"use client";

import { useMemo, useState } from "react";
import { Table } from "./table";
import { Chips, count } from "./chips";

export type TakeawayRow = {
  externalId: string;
  state: string;
  regulationArea: string;
  summary: string;
  takeaways: { title: string; text: string; sectionIds: string[] }[];
  textHash: string;
  reviewedAt?: string;
};

/** Takeaways tab: one row per bill × regulation area, filtered by area and state. */
export function Takeaways({
  rows,
  areas,
  billNumbers,
}: {
  rows: TakeawayRow[];
  areas: { key: string; label: string }[];
  /** bills.externalId → "SB 243" */
  billNumbers: Record<string, string>;
}) {
  const [state, setState] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);

  const states = useMemo(() => [...new Set(rows.map((r) => r.state))].sort(), [rows]);
  const byArea = count(rows.filter((r) => !state || r.state === state), (r) => [r.regulationArea]);
  const byState = count(rows.filter((r) => !area || r.regulationArea === area), (r) => [r.state]);
  const shown = rows.filter((r) => (!state || r.state === state) && (!area || r.regulationArea === area));
  const total = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <Chips
        label="Area"
        options={areas.map((c) => ({ key: c.key, label: c.label, count: byArea[c.key] ?? 0 }))}
        active={area}
        onChange={setArea}
        allCount={total(byArea)}
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
        columns={["State", "Bill", "Area", "Summary", "Takeaways"]}
        render={(r) => [
          r.state,
          <a
            key="b"
            href={`/bill/${r.state}/${encodeURIComponent(billNumbers[r.externalId] ?? "")}`}
            className="whitespace-nowrap font-map-mono text-[12px] text-ink underline decoration-hair underline-offset-2 hover:decoration-ink"
          >
            {billNumbers[r.externalId] ?? r.externalId}
          </a>,
          r.regulationArea,
          r.summary,
          <ul key="t" className="m-0 list-none p-0">
            {r.takeaways.map((t, i) => (
              <li key={i} className="py-0.5">
                <span>{t.title}</span>
                {t.sectionIds.length > 0 && (
                  <span className="ml-2 font-map-mono text-[11px] text-dim">{t.sectionIds.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>,
        ]}
      />
    </div>
  );
}
