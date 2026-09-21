"use client";

import { useMemo, useState } from "react";
import { TIERS } from "@/lib/map/data";
import { useMapData } from "./data-context";
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
  areaLabelMap,
} from "@/lib/map/derive";
import { barAccents, sectionForMode, type MapMode } from "@/lib/map/mode";
import type { DetailSelection, StateRecord } from "@/lib/map/types";
import {
  fixedOffset,
  useMeasuredHeight,
  useTweenNumbers,
  useTypewriter,
} from "./motion";
import {
  AccordionSection,
  DotScale,
  EmptyNote,
  GlyphTile,
  QuadrantMini,
  RollNumber,
  SegmentBar,
} from "./ui";

type OpenKey = "policy" | "ai" | "local" | null;

type Nums = {
  gwText: string;
  growthPct: string;
  completedText: string;
  pipelineText: string;
  postureText: string;
  aiText: string;
  billCount: string;
};

function numsOf(st: StateRecord): Nums {
  return {
    gwText: gw(st.mw),
    growthPct: `+${growthPct(st)}%`,
    completedText: String(st.sites.completed),
    pipelineText: String(st.sites.pipeline),
    postureText: sign(st.posture),
    aiText: String(st.ai),
    billCount: String(st.bills.length),
  };
}

const EASE_OUT = "cubic-bezier(.2,.7,.2,1)";
const EASE_STD = "cubic-bezier(.4,0,.2,1)";
const ITEM_TRANSITION = "color .2s ease, background .2s ease, box-shadow .2s ease";
const RING_C = 2 * Math.PI * 15.5;

export function StateDossierPanel({
  state,
  detail,
  onDetail,
  compact = false,
  animKey = 0,
  defaultOpen = { policy: true, ai: true, local: false },
  mode = "combined",
}: {
  state: StateRecord;
  detail: DetailSelection | null;
  onDetail: (d: DetailSelection | null) => void;
  compact?: boolean;
  animKey?: number;
  defaultOpen?: { policy: boolean; ai: boolean; local: boolean };
  /**
   * Broadsheet map mode. A single-axis mode opens its section (Compute →
   * Build-out, Regulation → Regulation) and takes over the matching bar's
   * accent while the other bar greys out. The quadrant chart stays as-is.
   */
  mode?: MapMode;
}) {
  const [open, setOpen] = useState<OpenKey>(
    sectionForMode(mode) ??
      (defaultOpen.policy ? "policy" : defaultOpen.ai ? "ai" : defaultOpen.local ? "local" : "policy"),
  );
  // Mode → section coupling fires on change only; the user may still toggle
  // sections freely afterwards. Combined leaves the current section alone.
  const [modeSeen, setModeSeen] = useState(mode);
  if (modeSeen !== mode) {
    setModeSeen(mode);
    const sec = sectionForMode(mode);
    if (sec) setOpen(sec);
  }
  const [hov, setHov] = useState<string | null>(null);
  // The tooltip keeps its last content/position while fading out.
  const [tip, setTip] = useState<{ id: string; x: number; y: number; on: boolean } | null>(
    null,
  );
  const clearHover = () => {
    setHov(null);
    setTip((t) => (t ? { ...t, on: false } : t));
  };

  // Number roll: remember the previous state record when the panel switches
  // states, and alternate `seq` so back-to-back switches restart the keyframes.
  const [roll, setRoll] = useState<{ state: StateRecord; prev: StateRecord | null; seq: number }>(
    { state, prev: null, seq: 0 },
  );
  if (roll.state.abbr !== state.abbr) {
    setRoll({ state, prev: roll.state, seq: roll.seq + 1 });
    // A layout shift under the cursor must not leave a stale hover tint behind.
    clearHover();
  }

  const { text: typedName, caret } = useTypewriter(state.name);

  const qc = state.q.color;
  const bar = barAccents(mode, qc);
  const { STATES, AREAS, caption } = useMapData();
  const tl = areaLabelMap(AREAS);
  const { maxMw, median } = useMemo(() => capacityStats(STATES), [STATES]);
  const anim = animKey % 2 === 0 ? "map-fade-up-a" : "map-fade-up-b";
  const nums = numsOf(state);
  const prev = roll.prev ? numsOf(roll.prev) : undefined;
  const slideOn = !!roll.prev;
  const rowIn = slideOn ? (roll.seq % 2 ? "map-row-in-a" : "map-row-in-b") : "";

  // Donut: a fixed ring count so the same <circle> nodes tween between states.
  const donut = useMemo(() => donutSegments(state), [state]);
  const donutEnd = -donut.reduce((a, d) => a + (d.v / 100) * RING_C, 0);
  const rings = Array.from({ length: 6 }, (_, i) =>
    donut[i] ?? { color: "#D7DBE0", dash: `0 ${RING_C}`, offset: donutEnd },
  );
  const prevDonut = useMemo(() => (roll.prev ? donutSegments(roll.prev) : []), [roll.prev]);
  const pcts = useTweenNumbers(Array.from({ length: 6 }, (_, i) => donut[i]?.v ?? 0));
  const legend = Array.from({ length: 6 }, (_, i) => {
    const d = donut[i];
    const on = !!d;
    return {
      on,
      color: on ? d.color : "#D7DBE0",
      // A row that just turned off keeps the previous state's label while it collapses.
      n: on ? d.n : (prevDonut[i]?.n ?? ""),
      pct: `${Math.round(pcts[i] ?? 0)}%`,
      delay: on ? 120 + i * 70 : 0,
    };
  });
  const [legendRef, legendH] = useMeasuredHeight<HTMLDivElement>();
  const [billsRef, billsH] = useMeasuredHeight<HTMLDivElement>();

  const areas = AREAS.map((t) => {
    const status = bucketStatus(state, t.k);
    const active = detail?.abbr === state.abbr && "k" in detail && detail.k === t.k;
    const g = grade(state, t.k);
    const hovered = hov === `${state.abbr}:k:${t.k}`;
    const glyph = interactiveGlyph(status, qc, active);
    const rowBg = active ? (status === 1 ? qc : "#14181D") : hovered ? "#ECEEF1" : "transparent";
    return {
      ...t,
      status,
      active,
      g,
      glyph,
      rowBg,
      tierName: TIERS[g.tier] ?? "None",
    };
  });

  const bills = sortedBills(state.bills).map((b, i) => {
    const active = detail?.abbr === state.abbr && "bill" in detail && detail.bill === b.n;
    const hovered = hov === `${state.abbr}:bill:${b.n}`;
    const accent = b.s === "pending" ? qc : "#14181D";
    return {
      ...b,
      active,
      delay: 80 + i * 45,
      rowBg: active ? accent : hovered ? "#ECEEF1" : "transparent",
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
    return Array.from({ length: billPool(STATES, k) }, (_, i) => i < c);
  };

  const toggle = (k: OpenKey) => setOpen((cur) => (cur === k ? null : k));

  // Empty states (FEATURES.md): say so instead of rendering zeros and blanks.
  const noSites = state.sites.completed + state.sites.pipeline === 0 && state.mw === 0;
  const noOps = state.ops.length === 0;
  const noBills = state.bills.length === 0;

  const tipArea = areas.find((t) => t.k === tip?.id);
  const tipOn = !!tip?.on;

  return (
    <div
      className={`flex min-w-[300px] flex-col ${compact ? "px-0" : "pr-5 pt-5"}`}
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
            {typedName}
            <span
              className="map-caret ml-[5px] inline-block h-[0.72em] w-[3px] translate-y-[0.08em] bg-ink"
              style={{ opacity: caret ? 1 : 0 }}
              aria-hidden
            />
          </h2>
          <p className="m-0 font-map-serif text-[18px] leading-[1.3] font-light italic text-pretty">
            {state.summary}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <QuadrantMini posture={state.posture} ai={state.ai} activeKey={state.q.key} />
          <div
            className="self-end text-right font-map-mono text-[11px] uppercase tracking-[0.1em] whitespace-nowrap transition-colors duration-300"
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
            <span>DC build-out</span>
            <RollNumber
              value={nums.postureText}
              prev={prev?.postureText}
              seq={roll.seq}
              align="end"
              className="text-ink"
            />
          </div>
          <SegmentBar cells={postureCells(state, bar.posture)} stagger="center" />
          <div className="flex justify-between font-map-mono text-[10px] text-dim">
            <span>Negligible</span>
            <span>Hyperscale</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between font-map-mono text-[11px] uppercase tracking-[0.08em] text-mute">
            <span>AI regulation</span>
            <span className="flex text-ink">
              <RollNumber value={nums.aiText} prev={prev?.aiText} seq={roll.seq} />
              <span>/6</span>
            </span>
          </div>
          <SegmentBar cells={aiCells(state, bar.ai)} stagger="ltr" />
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
        {noSites ? (
          <div className="py-4 pb-5">
            <EmptyNote>No data centers tracked in {state.name}.</EmptyNote>
          </div>
        ) : (
        <div className="flex flex-col gap-[18px] py-4 pb-5">
          <div className="grid grid-cols-3 gap-4 font-map-mono">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-mute">Active capacity</span>
              <RollNumber
                value={nums.gwText}
                prev={prev?.gwText}
                seq={roll.seq}
                className="text-[22px] leading-none text-ink"
              />
              <span className="flex gap-1 text-[11px] text-mute">
                <RollNumber value={nums.growthPct} prev={prev?.growthPct} seq={roll.seq} />
                <span>since 2021</span>
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-mute">Completed sites</span>
              <RollNumber
                value={nums.completedText}
                prev={prev?.completedText}
                seq={roll.seq}
                className="text-[22px] leading-none text-ink"
              />
              <span className="text-[11px] text-mute">operational</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-mute">Planned sites</span>
              <RollNumber
                value={nums.pipelineText}
                prev={prev?.pipelineText}
                seq={roll.seq}
                className="text-[22px] leading-none text-ink"
              />
              <span className="text-[11px] text-mute">building or proposed</span>
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
                style={{
                  left: `${((state.mw / maxMw) * 100).toFixed(1)}%`,
                  transition: `left .65s ${EASE_OUT}`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-[18px]">
            <svg viewBox="0 0 40 40" className="h-[74px] w-[74px] shrink-0 -rotate-90">
              <circle cx="20" cy="20" r="15.5" fill="none" stroke="#D7DBE0" strokeWidth="7" />
              {rings.map((d, i) => (
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
                  style={{
                    transition: `stroke-dasharray .7s ${EASE_STD}, stroke-dashoffset .7s ${EASE_STD}, stroke .5s ease`,
                  }}
                />
              ))}
            </svg>
            {noOps ? (
              <EmptyNote className="min-w-0 flex-1">
                No operating capacity on record. Sites are planned or their capacity is undisclosed.
              </EmptyNote>
            ) : (
            <div
              className="min-w-0 flex-1 overflow-hidden"
              style={{
                height: legendH ?? "auto",
                transition: `height .5s ${EASE_STD}`,
              }}
            >
              <div
                ref={legendRef}
                className="grid gap-x-4 font-map-mono text-[12px]"
                style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}
              >
                {legend.map((d, i) => (
                  <div
                    key={i}
                    className="grid min-w-0"
                    style={{
                      gridTemplateRows: d.on ? "1fr" : "0fr",
                      transition: `grid-template-rows .5s ${EASE_STD}`,
                    }}
                  >
                    <div
                      className="flex min-w-0 items-center gap-2 overflow-hidden py-[3px]"
                      style={{
                        opacity: d.on ? 1 : 0,
                        transform: d.on ? "none" : "translateY(-4px)",
                        transition: `opacity .35s ease ${d.delay}ms, transform .35s ease ${d.delay}ms`,
                      }}
                    >
                      <span
                        className="h-[9px] w-[9px] shrink-0 transition-colors duration-500"
                        style={{ background: d.color }}
                      />
                      <span className="min-w-0 truncate">{d.n}</span>
                      <span className="shrink-0 text-dim">{d.pct}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>
        )}
      </AccordionSection>

      <AccordionSection
        title="Regulation"
        open={open === "ai"}
        onToggle={() => toggle("ai")}
        delay="0.32s"
        bleed={8}
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
        <div className="flex flex-col gap-[18px] py-4 pb-5">
          <div
            className="grid gap-x-4 gap-y-2.5"
            style={{
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "repeat(5, auto)",
              gridAutoFlow: "column",
            }}
          >
            {areas.map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => {
                  clearHover();
                  onDetail(t.active ? null : { abbr: state.abbr, k: t.k });
                }}
                onMouseEnter={() => setHov(`${state.abbr}:k:${t.k}`)}
                onMouseLeave={() => setHov(null)}
                className="grid items-center gap-3 border-0 p-0 text-left"
                style={{
                  gridTemplateColumns: "32px minmax(0,1fr) auto",
                  color: t.glyph.text,
                  background: t.rowBg,
                  boxShadow: `0 0 0 4px ${t.rowBg}`,
                  transition: ITEM_TRANSITION,
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
                    const box = fixedOffset(e.currentTarget);
                    setTip({
                      id: t.k,
                      x: Math.max(228, r.right - box.left),
                      y: r.top - box.top,
                      on: true,
                    });
                  }}
                  onMouseLeave={() => setTip((c) => (c ? { ...c, on: false } : c))}
                >
                  <DotScale tier={t.g.tier} inverted={t.active} />
                </span>
              </button>
            ))}
          </div>
          {tipArea && tip && (
            <span
              className="pointer-events-none fixed z-50 w-[220px] bg-ink px-3 py-2.5 text-left font-map-mono text-[11px] leading-[1.45] tracking-normal text-paper normal-case"
              style={{
                left: tip.x,
                top: tip.y - 4,
                opacity: tipOn ? 1 : 0,
                transform: `translate(-100%,-100%) translateY(${tipOn ? 0 : 4}px)`,
                transition: "opacity .18s ease, transform .18s ease",
              }}
            >
              <span className="flex justify-between gap-2">
                <span className="tracking-[0.1em] uppercase">{tipArea.tierName}</span>
                <span className="text-dim">{tipArea.g.tier}/4</span>
              </span>
            </span>
          )}
          <div className="-mt-1.5 flex justify-between font-map-mono text-[10px] text-dim">
            <span>Stringency tier 0–4 · enacted law only</span>
          </div>
          {noBills && <EmptyNote>No AI legislation tracked in {state.name}.</EmptyNote>}
          <div
            className="-my-[9px] grid"
            style={{
              gridTemplateRows: state.preempt ? "1fr" : "0fr",
              transition: `grid-template-rows .32s ${EASE_STD}`,
            }}
          >
            <div
              className="min-h-0 overflow-hidden"
              style={{ opacity: state.preempt ? 1 : 0, transition: "opacity .28s ease" }}
            >
              <div className="flex items-center gap-2 py-[9px] font-map-mono text-[12px]">
                <span
                  className="h-2 w-2 rounded-full transition-colors duration-300"
                  style={{ background: qc }}
                />
                <span>Flagged under federal preemption order</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 font-map-mono text-[12px]">
            {(
              [
                ["Enacted", tiles("enacted"), "#14181D", true],
                ["Pending", tiles("pending"), qc, true],
                ["Proposed", tiles("proposed"), "#14181D", false],
              ] as const
            ).map(([label, ons, color, filled]) => (
              <div key={label} className="flex flex-col gap-2">
                <span
                  className="transition-colors duration-300"
                  style={{ color: label === "Pending" ? qc : undefined }}
                >
                  {label}
                </span>
                <div className="flex min-h-4 flex-wrap items-center">
                  {ons.map((on, i) => (
                    <span
                      key={i}
                      className="box-border h-4"
                      style={{
                        width: on ? 16 : 0,
                        marginRight: on ? 3 : 0,
                        transform: `scale(${on ? 1 : 0})`,
                        opacity: on ? 1 : 0,
                        background: filled ? color : "transparent",
                        border: filled ? undefined : `1.5px solid ${color}`,
                        transition:
                          "width .22s ease, margin .22s ease, transform .22s ease, opacity .22s ease, background .3s ease",
                        transitionDelay: `${i * 60}ms`,
                      }}
                    />
                  ))}
                  <span
                    className="text-dim"
                    style={{
                      opacity: ons.some(Boolean) ? 0 : 1,
                      transition: "opacity .25s ease .25s",
                    }}
                  >
                    —
                  </span>
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
        bleed={8}
        note={<RollNumber value={nums.billCount} prev={prev?.billCount} seq={roll.seq} />}
      >
        <div>
          <div
            className="overflow-hidden px-2 -mx-2"
            style={{
              height: billsH ?? "auto",
              transition: `height .45s ${EASE_OUT}`,
            }}
          >
            <div ref={billsRef} className="flex flex-col py-1 pb-3">
              {noBills && (
                <EmptyNote className="py-3">No bills tracked in {state.name}.</EmptyNote>
              )}
              {bills.map((b) => (
                <button
                  key={b.n}
                  type="button"
                  onClick={() => {
                    clearHover();
                    onDetail(b.active ? null : { abbr: state.abbr, bill: b.n });
                  }}
                  onMouseEnter={() => setHov(`${state.abbr}:bill:${b.n}`)}
                  onMouseLeave={() => setHov(null)}
                  className={`${rowIn} relative grid items-baseline gap-x-3.5 gap-y-1 border-0 border-b border-hair px-2 py-3 -mx-2 text-left font-inherit`}
                  style={{
                    gridTemplateColumns: "78px 1fr auto",
                    background: b.rowBg,
                    color: b.rowColor,
                    zIndex: b.active ? 1 : 0,
                    transition: ITEM_TRANSITION,
                    animationDelay: slideOn ? `${b.delay}ms` : undefined,
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
          </div>
        </div>
      </AccordionSection>

      <div
        className={`${anim} pt-[18px] font-map-mono text-[11px] text-dim`}
        style={{ animationDelay: "0.46s" }}
      >
        {caption}
      </div>
    </div>
  );
}
