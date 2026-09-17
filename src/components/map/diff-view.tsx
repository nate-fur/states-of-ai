"use client";

import { useMemo, useState } from "react";
import { STATES } from "@/lib/map/data";
import { buildDiff } from "@/lib/map/diff";
import { fixedOffset } from "./motion";
import { VERIFIED } from "@/lib/map/data";
import {
  AccordionSection,
  DotScale,
  GlyphTile,
  OutlineButton,
  OutlineSelect,
  QuadrantMini,
  SegmentBar,
} from "./ui";

export function DiffView({
  a,
  b,
  embedded = false,
  onChangeA,
  onChangeB,
}: {
  a: string;
  b: string;
  embedded?: boolean;
  onChangeA?: (abbr: string) => void;
  onChangeB?: (abbr: string) => void;
}) {
  const [showSame, setShowSame] = useState(true);
  const [open, setOpen] = useState<"metrics" | "gov" | "bills" | null>("metrics");
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    flip: boolean;
    state: string;
    tierName: string;
    tierNum: string;
  } | null>(null);

  const sa = STATES.find((s) => s.abbr === a);
  const sb = STATES.find((s) => s.abbr === b);
  const data = useMemo(
    () => (sa && sb ? buildDiff(sa, sb) : null),
    [sa, sb],
  );

  if (!sa || !sb || !data) return null;

  const toggle = (k: "metrics" | "gov" | "bills") =>
    setOpen((cur) => (cur === k ? null : k));

  const delay = (n: number) =>
    embedded ? `${0.1 + n * 0.06}s` : `${n * 0.06}s`;

  return (
    <div
      className="mx-auto text-ink"
      style={{
        maxWidth: embedded ? "none" : 1040,
        minHeight: embedded ? 0 : "100vh",
        padding: embedded ? "0 0 40px" : "0 28px 72px",
        borderLeft: embedded ? 0 : "1px solid #D7DBE0",
        borderRight: embedded ? 0 : "1px solid #D7DBE0",
      }}
    >
      {!embedded && (
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-hair bg-paper py-3.5 pb-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
          <span>State diff</span>
          <div className="flex items-center gap-2">
            <OutlineSelect
              value={a}
              onChange={(e) => onChangeA?.(e.target.value)}
            >
              {STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>
                  {s.name}
                </option>
              ))}
            </OutlineSelect>
            <OutlineButton
              aria-label="Swap"
              className="flex h-7 w-7 items-center justify-center px-0"
              onClick={() => {
                onChangeA?.(b);
                onChangeB?.(a);
              }}
            >
              ⇄
            </OutlineButton>
            <OutlineSelect
              value={b}
              onChange={(e) => onChangeB?.(e.target.value)}
            >
              {STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>
                  {s.name}
                </option>
              ))}
            </OutlineSelect>
          </div>
        </div>
      )}

      <div
        className="map-fade-up flex flex-wrap gap-7 border-b border-ink"
        style={{
          padding: embedded ? "20px 0 24px" : "28px 0 26px",
          animationDelay: delay(0),
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3.5" style={{ flexBasis: 380 }}>
          <h2 className="m-0 flex flex-wrap items-baseline gap-3 font-map-serif text-[clamp(34px,5vw,50px)] leading-[0.95] font-normal tracking-[-0.03em]">
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5"
                style={{ background: data.A.color }}
              />
              {data.A.name}
            </span>
            <span className="font-light italic text-dim text-[22px]">vs</span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block box-border h-3.5 w-3.5 bg-paper"
                style={{ border: `2px solid ${data.B.color}` }}
              />
              {data.B.name}
            </span>
          </h2>
          <p className="m-0 font-map-serif text-[20px] leading-[1.35] font-light italic text-pretty">
            {data.headline}
          </p>
          <div className="font-map-mono text-[11px] uppercase tracking-[0.08em]">
            <span className="text-ink">{data.diffCount}</span>
            <span className="text-mute"> differ · </span>
            <span className="text-ink">{data.sameCount}</span>
            <span className="text-mute"> same · </span>
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-inherit text-mute underline decoration-hair-3 underline-offset-[3px]"
              onClick={() => setShowSame((v) => !v)}
            >
              {showSame ? "hide same" : "show same"}
            </button>
          </div>
        </div>
        <QuadrantMini
          posture={sa.posture}
          ai={sa.ai}
          size={135}
          a={{ posture: sa.posture, ai: sa.ai, color: sa.q.color }}
          b={{ posture: sb.posture, ai: sb.ai, color: sb.q.color }}
        />
      </div>

      <AccordionSection
        title="Metrics"
        open={open === "metrics"}
        onToggle={() => toggle("metrics")}
        delay={delay(1)}
        note={data.metricsNote}
      >
        <div className="flex flex-col py-1">
          <div
            className="grid gap-x-5 border-b border-hair py-2 font-map-mono text-[10px] uppercase tracking-[0.08em] text-mute"
            style={{
              gridTemplateColumns:
                "minmax(0,1.7fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.7fr)",
            }}
          >
            <span>Metric</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5" style={{ background: data.A.color }} />
              {data.A.abbr}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block box-border h-2.5 w-2.5 bg-paper"
                style={{ border: `2px solid ${data.B.color}` }}
              />
              {data.B.abbr}
            </span>
            <span className="text-right">Delta</span>
          </div>
          {data.metrics.map((r) => {
            if (r.same && !showSame) return null;
            return (
              <div
                key={r.label}
                className="grid items-baseline gap-x-5 border-b border-hair py-3.5"
                style={{
                  gridTemplateColumns:
                    "minmax(0,1.7fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.7fr)",
                  opacity: r.same ? 0.5 : 1,
                }}
              >
                <div>
                  <div className="font-map-serif text-[17px]">{r.label}</div>
                  <div className="font-map-mono text-[11px] text-dim">{r.sub}</div>
                </div>
                {[r.a, r.b].map((val, i) => (
                  <div key={i}>
                    <div
                      className="font-map-mono leading-none"
                      style={{ fontSize: r.size }}
                    >
                      {val}
                    </div>
                    {r.hasBars && (
                      <div className="mt-1.5 max-w-[120px]">
                        <SegmentBar
                          cells={i === 0 ? r.aCells! : r.bCells!}
                          height={7}
                        />
                      </div>
                    )}
                    <div className="mt-1 font-map-mono text-[11px] text-dim">
                      {i === 0 ? r.aSub : r.bSub}
                    </div>
                  </div>
                ))}
                <div className="text-right">
                  <div
                    className="font-map-mono text-[12px] font-medium"
                    style={{ color: r.deltaColor }}
                  >
                    {r.delta}
                  </div>
                  {r.deltaSub ? (
                    <div className="font-map-mono text-[11px] text-dim">
                      {r.deltaSub}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </AccordionSection>

      <AccordionSection
        title="Governance"
        open={open === "gov"}
        onToggle={() => toggle("gov")}
        delay={delay(2)}
        note={data.govNote}
      >
        <div className="flex flex-col py-1">
          {data.gov.map((r) => {
            if (r.same && !showSame) return null;
            return (
              <div
                key={r.label}
                className="grid items-center gap-x-5 border-b border-hair py-2.5"
                style={{
                  gridTemplateColumns:
                    "minmax(0,1.7fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.7fr)",
                  opacity: r.same ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-3">
                  <GlyphTile
                    glyph={r.glyph}
                    bg={r.neither ? "transparent" : "#14181D"}
                    border={r.neither ? "#D7DBE0" : "#14181D"}
                    icon={r.neither ? "#C4C9CF" : "#fff"}
                    size={30}
                  />
                  <span
                    className="font-map-mono text-[13px]"
                    style={{ color: r.neither ? "#9AA1A9" : "#14181D" }}
                  >
                    {r.label}
                  </span>
                </div>
                {(
                  [
                    [r.aTier, r.aName, r.aPending, data.A.abbr],
                    [r.bTier, r.bName, r.bPending, data.B.abbr],
                  ] as const
                ).map(([tier, name, pending, abbr], i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex flex-col items-start gap-1 border-0 bg-transparent p-0 text-left"
                    onMouseEnter={(e) => {
                      // Embedded in the Broadsheet drawer the tooltip's fixed
                      // coordinates resolve against the transformed drawer,
                      // not the viewport; express them in that space.
                      const rect = e.currentTarget.getBoundingClientRect();
                      const box = fixedOffset(e.currentTarget);
                      const left = rect.left - box.left;
                      const top = rect.top - box.top;
                      const bottom = rect.bottom - box.top;
                      const flip = top - 86 < 8;
                      setTip({
                        x: Math.max(8, Math.min(left, box.right - box.left - 228)),
                        y: flip ? bottom + 6 : top - 6,
                        flip,
                        state: abbr,
                        tierName: name,
                        tierNum: String(tier),
                      });
                    }}
                    onMouseLeave={() => setTip(null)}
                  >
                    <DotScale tier={tier} pending={pending} />
                    <span
                      className="font-map-mono text-[12px]"
                      style={{ color: tier > 0 ? "#14181D" : "#9AA1A9" }}
                    >
                      {name}
                    </span>
                  </button>
                ))}
                <div className="text-right">
                  <div
                    className="font-map-mono text-[12px] font-medium"
                    style={{ color: r.deltaColor }}
                  >
                    {r.delta}
                  </div>
                  <div className="font-map-mono text-[11px] text-dim">
                    {r.deltaSub}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between gap-3 py-2.5 font-map-mono text-[10px] text-dim">
            <span>Stringency tier 0–4 · enacted law only</span>
            <span className="flex items-center gap-[5px]">
              <span className="box-border h-1.5 w-1.5 rounded-full border border-mute" />
              pending could lift
            </span>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Bills, merged"
        open={open === "bills"}
        onToggle={() => toggle("bills")}
        delay={delay(3)}
        note={data.billsNote}
      >
        <div className="flex flex-col py-1 pb-3">
          {data.bills.map((bill) => (
            <div
              key={`${bill.stateName}-${bill.n}`}
              className="grid items-baseline gap-x-3.5 gap-y-1 border-b border-hair py-3"
              style={{
                gridTemplateColumns: "22px minmax(0,78px) minmax(0,1fr) auto",
              }}
            >
              <span
                className="box-border h-2.5 w-2.5 self-center"
                style={{
                  background: bill.markBg,
                  border: `2px solid ${bill.markBorder}`,
                }}
              />
              <span className="overflow-wrap-anywhere font-map-mono text-[13px] font-medium">
                {bill.n}
              </span>
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-[15px] leading-[1.35] text-pretty">
                  {bill.t}
                </span>
                <span className="font-map-mono text-[11px] text-mute">
                  {bill.stateName} · {bill.tagText} · {bill.d}
                </span>
              </div>
              <span
                className="whitespace-nowrap font-map-mono text-[12px]"
                style={{ color: bill.statusColor }}
              >
                {bill.s}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {!embedded && (
        <div className="pt-[18px] font-map-mono text-[11px] text-dim">
          Sample data, illustrative only. Last verified {VERIFIED}.
        </div>
      )}

      {tip && (
        <div
          className="pointer-events-none fixed z-[9999] w-[220px] bg-ink px-3 py-2.5 font-map-mono text-[11px] leading-[1.45] text-paper"
          style={{
            left: tip.x,
            top: tip.y,
            transform: tip.flip
              ? "translateY(0)"
              : "translateY(-100%)",
          }}
        >
          <span className="flex justify-between gap-2">
            <span className="tracking-[0.1em] uppercase">
              {tip.state} · {tip.tierName}
            </span>
            <span className="text-dim">{tip.tierNum}/4</span>
          </span>
        </div>
      )}
    </div>
  );
}
