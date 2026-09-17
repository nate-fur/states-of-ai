"use client";

import { useMemo, useState } from "react";
import { STATES, TOPICS, VERIFIED } from "@/lib/map/data";
import {
  aiCells,
  billPool,
  bucketStatus,
  capacityStats,
  donutSegments,
  grade,
  growthPct,
  gw,
  interactiveGlyph,
  postureCells,
  sign,
  sortedBills,
  statusColor,
  topicLabelMap,
} from "@/lib/map/derive";
import type { DetailSelection, StateRecord } from "@/lib/map/types";
import {
  AccordionSection,
  DotScale,
  GlyphTile,
  QuadrantMini,
  SegmentBar,
} from "./ui";

type OpenKey = "policy" | "ai" | "local" | null;

export function StateDossierPanel({
  state,
  detail,
  onDetail,
  compact = false,
  animKey = 0,
  defaultOpen = { policy: true, ai: true, local: false },
}: {
  state: StateRecord;
  detail: DetailSelection | null;
  onDetail: (d: DetailSelection | null) => void;
  compact?: boolean;
  animKey?: number;
  defaultOpen?: { policy: boolean; ai: boolean; local: boolean };
}) {
  const [open, setOpen] = useState<OpenKey>(
    defaultOpen.policy ? "policy" : defaultOpen.ai ? "ai" : defaultOpen.local ? "local" : "policy",
  );
  const [hov, setHov] = useState<string | null>(null);
  const [tip, setTip] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const qc = state.q.color;
  const tl = topicLabelMap();
  const { maxMw, median } = useMemo(() => capacityStats(STATES), []);
  const donut = useMemo(() => donutSegments(state), [state]);
  const anim = animKey % 2 === 0 ? "map-fade-up-a" : "map-fade-up-b";

  const topics = TOPICS.map((t) => {
    const status = bucketStatus(state, t.k);
    const active = detail?.abbr === state.abbr && "k" in detail && detail.k === t.k;
    const g = grade(state, t.k);
    const inverted = !!active;
    const hovered = hov === `${state.abbr}:k:${t.k}`;
    const glyph = interactiveGlyph(status, qc, inverted);
    return {
      ...t,
      status,
      active,
      g,
      glyph,
      rowBg: active ? (status === 1 ? qc : "#14181D") : hovered ? "#ECEEF1" : "transparent",
      outline: active || hovered ? `0 0 0 4px ${active ? (status === 1 ? qc : "#14181D") : "#ECEEF1"}` : "none",
      scoreColor: inverted ? "#fff" : g.tier > 0 ? "#14181D" : "#9AA1A9",
    };
  });

  const bills = sortedBills(state.bills).map((b) => {
    const active = detail?.abbr === state.abbr && "bill" in detail && detail.bill === b.n;
    const hovered = hov === `${state.abbr}:bill:${b.n}`;
    const accent = b.s === "pending" ? qc : "#14181D";
    const rowBg = active ? accent : hovered ? "#ECEEF1" : "transparent";
    return {
      ...b,
      active,
      rowBg,
      rowColor: active ? "#fff" : "#14181D",
      capColor: active ? "rgba(255,255,255,.75)" : "#5F6770",
      statusColor: active ? "#fff" : statusColor(b.s, qc),
      tagText: b.tags.map((k) => tl[k] || k).join(", "),
    };
  });

  const n = (k: "enacted" | "pending" | "proposed") =>
    state.bills.filter((b) => b.s === k).length;
  const tiles = (k: "enacted" | "pending" | "proposed") => {
    const c = n(k);
    const pool = billPool(STATES, k);
    return Array.from({ length: pool }, (_, i) => i < c);
  };

  const toggle = (k: OpenKey) => setOpen((cur) => (cur === k ? null : k));

  return (
    <div
      className={`flex min-w-0 flex-col ${compact ? "px-0" : "pr-5 pt-5"}`}
      style={{ flex: "1 1 320px" }}
    >
      <div
        className={`${anim} grid items-start gap-5 pb-[22px]`}
        style={{
          gridTemplateColumns: "1fr 120px",
          animationDelay: "0.12s",
        }}
      >
        <div className="flex min-w-0 flex-col gap-3.5">
          <h2 className="m-0 font-map-serif text-[50px] leading-[0.93] font-normal tracking-[-0.03em] text-balance">
            {state.name}
          </h2>
          <p className="m-0 font-map-serif text-[18px] leading-[1.3] font-light italic text-pretty">
            {state.summary}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <QuadrantMini posture={state.posture} ai={state.ai} activeKey={state.q.key} />
          <div
            className="self-end text-right font-map-mono text-[11px] uppercase tracking-[0.1em] whitespace-nowrap"
            style={{ color: qc }}
          >
            {state.q.label}
          </div>
        </div>
      </div>

      <div
        className={`${anim} grid grid-cols-2 gap-5 border-b border-ink pb-[22px]`}
        style={{ animationDelay: "0.18s" }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between font-map-mono text-[11px] uppercase tracking-[0.08em] text-mute">
            <span>DC posture</span>
            <span className="text-ink">{sign(state.posture)}</span>
          </div>
          <SegmentBar cells={postureCells(state)} />
          <div className="flex justify-between font-map-mono text-[10px] text-dim">
            <span>Restrict</span>
            <span>Accelerate</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between font-map-mono text-[11px] uppercase tracking-[0.08em] text-mute">
            <span>AI regulation</span>
            <span className="text-ink">{state.ai}/6</span>
          </div>
          <SegmentBar cells={aiCells(state)} />
          <div className="flex justify-between font-map-mono text-[10px] text-dim">
            <span>Weak</span>
            <span>Strong</span>
          </div>
        </div>
      </div>

      <AccordionSection
        title="Build-out"
        open={open === "policy"}
        onToggle={() => toggle("policy")}
        delay="0.26s"
        note={
          <span className="flex gap-1.5">
            {state.sources.build.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener" className="text-mute no-underline">
                {s.label}
              </a>
            ))}
          </span>
        }
      >
        <div className="flex flex-col gap-[18px] py-4 pb-5">
          <div className="grid grid-cols-3 gap-4 font-map-mono">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-mute">Capacity</span>
              <span className="text-[22px] leading-none text-ink">{gw(state.mw)}</span>
              <span className="text-[11px] text-mute">+{growthPct(state)}% since 2021</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-mute">Sites</span>
              <span className="text-[22px] leading-none text-ink">{state.count}</span>
              <span
                className="text-[11px]"
                style={{ color: state.incentives ? "#4A8C82" : "#7B838C" }}
              >
                incentives {state.incentives ? "active" : "none"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-mute">Local pushback</span>
              <span className="text-[22px] leading-none text-ink">{state.local.length}</span>
              <span className="text-[11px] text-mute">city actions</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 font-map-mono text-[11px] text-mute">
            <span>Capacity vs. all states</span>
            <div className="relative h-1 bg-hair">
              <span
                className="absolute top-[-3px] h-2.5 w-px bg-dim"
                style={{ left: `${((median / maxMw) * 100).toFixed(1)}%` }}
              />
              <span
                className="absolute top-[-4px] h-3 w-[3px] -translate-x-1/2 bg-ink"
                style={{ left: `${((state.mw / maxMw) * 100).toFixed(1)}%` }}
              />
            </div>
          </div>
          <div className="font-map-mono text-[11px] text-mute">
            Moratorium: <span className="text-ink">{state.moratorium}</span>
          </div>
          <div className="flex items-center gap-[18px]">
            <svg viewBox="0 0 40 40" className="h-[74px] w-[74px] shrink-0 -rotate-90">
              <circle cx="20" cy="20" r="15.5" fill="none" stroke="#D7DBE0" strokeWidth="7" />
              {donut.map((d, i) => (
                <circle
                  key={i}
                  cx="20"
                  cy="20"
                  r="15.5"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="7"
                  strokeDasharray={d.dash}
                  strokeDashoffset={d.offset}
                />
              ))}
            </svg>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 font-map-mono text-[12px]">
              {donut.map((d) => (
                <div key={d.n} className="flex min-w-0 items-center gap-2 py-[3px]">
                  <span className="h-[9px] w-[9px] shrink-0" style={{ background: d.color }} />
                  <span className="min-w-0 truncate">{d.n}</span>
                  <span className="shrink-0 text-dim">{d.v}%</span>
                </div>
              ))}
            </div>
          </div>
          {state.local.length > 0 && (
            <div className="flex flex-col gap-1.5 text-[14px] leading-[1.4]">
              {state.local.map((c) => (
                <div key={c.p + c.a} className="flex items-baseline gap-2.5">
                  <span className="min-w-[120px] font-map-mono text-[12px]">{c.p}</span>
                  <span className="text-ink-2">{c.a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccordionSection>

      <AccordionSection
        title="Regulation"
        open={open === "ai"}
        onToggle={() => toggle("ai")}
        delay="0.32s"
        note={
          <span className="flex gap-1.5">
            {state.sources.gov.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener" className="text-mute no-underline">
                {s.label}
              </a>
            ))}
          </span>
        }
      >
        <div className="flex flex-col gap-[18px] px-2 py-4 pb-5 -mx-2">
          <div
            className="grid gap-x-4 gap-y-2.5"
            style={{
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "repeat(5, auto)",
              gridAutoFlow: "column",
            }}
          >
            {topics.map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() =>
                  onDetail(t.active ? null : { abbr: state.abbr, k: t.k })
                }
                onMouseEnter={() => setHov(`${state.abbr}:k:${t.k}`)}
                onMouseLeave={() => setHov(null)}
                className="grid items-center gap-3 border-0 p-0 text-left transition-colors"
                style={{
                  gridTemplateColumns: "32px minmax(0,1fr) auto",
                  color: t.glyph.text,
                  background: t.rowBg,
                  boxShadow: t.outline,
                }}
              >
                <GlyphTile glyph={t.icon} {...t.glyph} />
                <span className="min-w-0 font-map-mono text-[13px] leading-[1.25]">
                  {t.label}
                </span>
                <span
                  className="relative flex shrink-0 items-center py-1.5"
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTip({ id: t.k, x: r.right, y: r.top });
                  }}
                  onMouseLeave={() => setTip(null)}
                >
                  <DotScale tier={t.g.tier} inverted={t.active} />
                  {tip?.id === t.k && (
                    <span
                      className="pointer-events-none fixed z-50 w-[220px] -translate-x-full -translate-y-full bg-ink px-3 py-2.5 text-left font-map-mono text-[11px] leading-[1.45] tracking-normal text-paper normal-case"
                      style={{ left: tip.x, top: tip.y - 4 }}
                    >
                      <span className="mb-[5px] flex justify-between gap-2">
                        <span className="tracking-[0.1em] uppercase">
                          {["None", "Light", "Moderate", "Strong", "Comprehensive"][t.g.tier]}
                        </span>
                        <span className="text-dim">{t.g.tier}/4</span>
                      </span>
                      <span className="block font-map-serif text-[13.5px] leading-[1.4] text-pretty">
                        {t.rubric[t.g.tier]}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-between font-map-mono text-[10px] text-dim">
            <span>Stringency tier 0–4 · enacted law only</span>
          </div>
          {state.preempt && (
            <div className="flex items-center gap-2 font-map-mono text-[12px]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: qc }}
              />
              <span>Flagged under federal preemption order</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 font-map-mono text-[12px]">
            {(
              [
                ["Enacted", tiles("enacted"), "#14181D", true],
                ["Pending", tiles("pending"), qc, true],
                ["Proposed", tiles("proposed"), "#14181D", false],
              ] as const
            ).map(([label, ons, color, filled]) => (
              <div key={label} className="flex flex-col gap-2">
                <span style={{ color: label === "Pending" ? qc : undefined }}>
                  {label}
                </span>
                <div className="flex min-h-4 flex-wrap items-center">
                  {ons.some(Boolean) ? (
                    ons.map((on, i) =>
                      on ? (
                        <span
                          key={i}
                          className="mr-[3px] h-4 w-4"
                          style={{
                            background: filled ? color : "transparent",
                            border: filled ? undefined : `1.5px solid ${color}`,
                            boxSizing: "border-box",
                          }}
                        />
                      ) : null,
                    )
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Bills"
        open={open === "local"}
        onToggle={() => toggle("local")}
        delay="0.38s"
        note={<span>{state.bills.length}</span>}
      >
        <div className="flex flex-col px-2 py-1 pb-3 -mx-2">
          {bills.map((b) => (
            <button
              key={b.n}
              type="button"
              onClick={() =>
                onDetail(b.active ? null : { abbr: state.abbr, bill: b.n })
              }
              onMouseEnter={() => setHov(`${state.abbr}:bill:${b.n}`)}
              onMouseLeave={() => setHov(null)}
              className="grid items-baseline gap-x-3.5 gap-y-1 border-0 border-b border-hair px-2 py-3 -mx-2 text-left font-inherit transition-colors"
              style={{
                gridTemplateColumns: "78px 1fr auto",
                background: b.rowBg,
                color: b.rowColor,
              }}
            >
              <span className="whitespace-nowrap font-map-mono text-[13px] font-medium">
                {b.n}
              </span>
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-[15px] leading-[1.35] text-pretty">{b.t}</span>
                <span className="font-map-mono text-[11px]" style={{ color: b.capColor }}>
                  {b.tagText} · {b.d}
                </span>
              </div>
              <span
                className="whitespace-nowrap font-map-mono text-[12px]"
                style={{ color: b.statusColor }}
              >
                {b.s}
              </span>
            </button>
          ))}
        </div>
      </AccordionSection>

      <div
        className={`${anim} pt-[18px] font-map-mono text-[11px] text-dim`}
        style={{ animationDelay: "0.46s" }}
      >
        Sample data, illustrative only. Last verified {VERIFIED}.
      </div>
    </div>
  );
}
