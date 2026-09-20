"use client";

import { useState } from "react";
import { buildDetail } from "@/lib/map/derive";
import { cite } from "@/lib/bill/parse";
import { billKey } from "@/lib/bill/types";
import { useMapData } from "./data-context";
import type { DetailSelection, StateRecord } from "@/lib/map/types";
import { GlyphTile, OutlineButton } from "./ui";
import { InfoDot, useInfoTip } from "@/components/bill/info-tip";
import { useBillDetail } from "@/components/bill/use-bill-detail";

const EASE_STD = "cubic-bezier(.4,0,.2,1)";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function DetailRail({
  detail,
  state,
  onClose,
  onDetail,
  onOpenReader,
  widthClass = "w-[380px] max-w-full",
  animKey = 0,
  className = "",
}: {
  detail: DetailSelection | null;
  state: StateRecord | undefined;
  onClose: () => void;
  onDetail: (d: DetailSelection) => void;
  /** Open the Bill Reader for "CA:SB 243", optionally on a takeaway's first citation. */
  onOpenReader: (key: string, focus?: string) => void;
  widthClass?: string;
  /** Alternate on each new selection so the entrance stagger re-runs. */
  animKey?: number;
  className?: string;
}) {
  const { STATES, AREAS } = useMapData();
  const data = buildDetail(detail, state, STATES, AREAS);
  const anim = animKey % 2 === 0 ? "map-fade-up-a" : "map-fade-up-b";
  const tip = useInfoTip();

  // Which policy row is expanded in the bill panel; one at a time, and
  // remembered per bill so a new selection starts collapsed.
  const key = data?.kind === "bill" ? billKey(data.abbr, data.label) : null;
  const [pol, setPol] = useState<{ key: string | null; k: string | null }>({ key: null, k: null });
  const openPol = pol.key === key ? pol.k : null;
  const setOpenPol = (next: (cur: string | null) => string | null) => setPol({ key, k: next(openPol) });
  // Takeaways for the bill panel; nothing to load for seed bills.
  const { data: bill } = useBillDetail(key, !!(data?.kind === "bill" && data.hasText));

  if (!data) return null;

  return (
    <div className={`min-w-0 overflow-x-hidden overflow-y-auto border-r border-hair bg-paper-2 ${className}`}>
      <div className={`flex flex-col gap-[22px] px-7 pb-12 ${widthClass}`}>
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-hair bg-paper-2 py-3.5 pb-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
          <span className="min-w-0 truncate">
            {data.abbr} · {data.kind === "bill" ? "bill" : "policy"}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <a
              href={data.legiscanUrl}
              target="_blank"
              rel="noopener"
              className="whitespace-nowrap border border-ink bg-ink px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-white no-underline hover:bg-paper hover:text-ink"
            >
              {data.legiscanLabel} ↗
            </a>
            <OutlineButton aria-label="Close" className="flex h-7 w-7 items-center justify-center px-0 text-base leading-none" onClick={onClose}>
              ×
            </OutlineButton>
          </span>
        </div>

        <div className={`${anim} flex items-center gap-3.5`} style={{ animationDelay: "0.28s" }}>
          <GlyphTile
            glyph={data.glyph}
            bg={data.bg}
            border={data.border}
            icon={data.iconColor}
            size={44}
            fontSize={18}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-2.5">
              <h3 className="m-0 whitespace-nowrap font-map-serif text-[28px] leading-none font-normal tracking-[-0.02em]">
                {data.label}
              </h3>
              {data.kind === "area" && <InfoDot size={18} text={data.desc} show={tip.show} hide={tip.hide} />}
            </span>
            {data.kind === "bill" && (
              <span className="font-map-serif text-[15px] leading-[1.25] text-mute text-pretty">{data.title}</span>
            )}
            <span
              className="font-map-mono text-[11px] uppercase tracking-[0.08em]"
              style={{ color: data.statusColor }}
            >
              {data.statusText}
            </span>
          </div>
        </div>

        {data.kind === "bill" ? (
          <>
            {data.gist && (
              <div className={`${anim} flex flex-col gap-2.5`} style={{ animationDelay: "0.35s" }}>
                <p className="m-0 font-map-serif text-[20px] leading-[1.3] tracking-[-0.01em] text-pretty">{data.gist}</p>
              </div>
            )}
            <div className={`${anim} flex flex-col`} style={{ animationDelay: "0.42s" }}>
              <div className="flex justify-between border-b border-ink pb-2 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                <span>Policies</span>
                <span>{data.buckets.length}</span>
              </div>
              {data.buckets.map((t) => {
                const rows = bill?.regulationAreas.find((a) => a.regulationArea === t.k)?.takeaways ?? [];
                const count = rows.length || t.takeaways;
                const hasMore = count > 0;
                const open = openPol === t.k;
                const rowClick = () => {
                  if (hasMore) setOpenPol((cur) => (cur === t.k ? null : t.k));
                  else if (data.hasText && key) onOpenReader(key);
                  else onDetail({ abbr: data.abbr, k: t.k });
                };
                return (
                  <div key={t.k} className="flex flex-col border-b border-hair">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={rowClick}
                      className="-mx-1.5 grid cursor-pointer items-start gap-x-3.5 gap-y-1 border-0 bg-transparent px-1.5 pt-3.5 pb-3 text-left text-ink"
                      style={{ gridTemplateColumns: "32px 1fr" }}
                    >
                      <GlyphTile glyph={t.glyph} bg={t.bg} border={t.border} icon={t.iconColor} />
                      <span className="flex min-w-0 flex-col gap-[5px]">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="font-map-mono text-[13px]">{t.label}</span>
                            <InfoDot size={16} text={t.desc} show={tip.show} hide={tip.hide} />
                          </span>
                          <span className="flex flex-none items-center gap-2">
                            {hasMore && (
                              <span className="whitespace-nowrap font-map-mono text-[11px] text-dim">{plural(count, "takeaway")}</span>
                            )}
                            {hasMore && (
                              <span
                                className="flex h-[18px] w-[18px] items-center justify-center border border-hair-3 text-[11px] leading-none text-ink"
                                style={{ transform: `rotate(${open ? 180 : 0}deg)`, transition: `transform .3s ${EASE_STD}` }}
                              >
                                ▾
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="font-map-serif text-[15px] leading-[1.45] text-ink text-pretty">{t.summary}</span>
                      </span>
                    </button>
                    {hasMore && (
                      <div className="grid" style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: `grid-template-rows .35s ${EASE_STD}` }}>
                        <div className="min-h-0 overflow-hidden" style={{ opacity: open ? 1 : 0, transition: "opacity .25s ease" }}>
                          <div className="flex flex-col gap-3 pb-3.5 pl-[46px]">
                            {rows.length === 0 ? (
                              <span className="font-map-mono text-[11px] text-dim">Loading takeaways…</span>
                            ) : (
                              rows.map((k, i) => {
                                const first = k.sectionIds[0];
                                const citation =
                                  first === undefined ? "" : k.sectionIds.length === 1 ? cite(first) : `${cite(first)} +${k.sectionIds.length - 1}`;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => key && onOpenReader(key, first)}
                                    className="-mx-2.5 flex cursor-pointer flex-col gap-[3px] border-0 border-l-2 border-l-hair bg-transparent px-2.5 py-2 text-left text-ink hover:border-l-ink"
                                    style={{ transition: "border-color .2s ease" }}
                                  >
                                    <span className="font-map-serif text-[15px] leading-[1.3]">{k.title}</span>
                                    {citation && <span className="font-map-mono text-[11px] text-dim">{citation}</span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data.hasText && key && (
              <button
                type="button"
                onClick={() => onOpenReader(key)}
                className={`${anim} flex w-full items-center justify-between gap-3 border border-ink bg-transparent px-3.5 py-3 text-left text-ink hover:bg-ink hover:text-white`}
                style={{ animationDelay: "0.46s", transition: "background .2s ease, color .2s ease" }}
              >
                <span className="flex flex-col gap-[3px]">
                  <span className="font-map-serif text-[17px] leading-[1.2]">Read the bill</span>
                  <span className="font-map-mono text-[11px] tracking-[0.06em] opacity-70">{data.textMeta}</span>
                </span>
                <span className="font-map-mono text-[16px]">→</span>
              </button>
            )}
          </>
        ) : (
          <>
            <p
              className={`${anim} m-0 font-map-serif text-[18px] leading-[1.4] tracking-[-0.005em] text-pretty`}
              style={{ animationDelay: "0.35s" }}
            >
              {data.stateSummary}
            </p>
            <div
              className={`${anim} grid items-baseline gap-x-4 gap-y-2 border-y border-hair py-3 font-map-mono text-[12px]`}
              style={{
                gridTemplateColumns: "1fr auto",
                animationDelay: "0.38s",
              }}
            >
              <span className="text-mute">Stringency</span>
              <span className="flex items-baseline gap-2">
                <span className="font-map-serif text-[20px] leading-none">
                  {data.tierName}
                </span>
                <span className="text-dim">{data.tierNum}/4</span>
              </span>
              {data.rubric && (
                <span className="col-span-2 font-map-serif text-[14px] leading-[1.4] text-mute text-pretty">{data.rubric}</span>
              )}
              <span className="text-mute">At this tier or above</span>
              <span>{data.peersText}</span>
            </div>
            <div className={`${anim} flex flex-col`} style={{ animationDelay: "0.42s" }}>
              <div className="flex justify-between border-b border-ink pb-2 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                <span>Bills in {data.stateName}</span>
                <span>{data.bills.length}</span>
              </div>
              {data.bills.length === 0 ? (
                <p className="m-0 py-3 font-map-mono text-[12px] text-dim">
                  No tracked bills in this bucket.
                </p>
              ) : (
                data.bills.map((b) => (
                  // With text on file the row opens the reader; otherwise the bill's own panel.
                  <button
                    key={b.n}
                    type="button"
                    onClick={() =>
                      b.hasText ? onOpenReader(billKey(data.abbr, b.n)) : onDetail({ abbr: data.abbr, bill: b.n })
                    }
                    className="grid items-baseline gap-x-3.5 gap-y-1 border-0 border-b border-hair bg-transparent px-1.5 py-3 -mx-1.5 text-left text-ink hover:bg-hover-2"
                    style={{ gridTemplateColumns: "78px 1fr" }}
                  >
                    <span className="whitespace-nowrap font-map-mono text-[13px] font-medium">{b.n}</span>
                    <span className="flex min-w-0 flex-col gap-[5px]">
                      <span className="text-[15px] leading-[1.35] text-pretty">{b.t}</span>
                      <span className="font-map-mono text-[11px]" style={{ color: b.color }}>
                        {b.s} · {b.d}
                      </span>
                      {b.summary && (
                        <>
                          <span className="pt-0.5 text-[14.5px] leading-[1.45] text-ink-2 text-pretty">{b.summary}</span>
                          {b.hasText && (
                            <span className="font-map-mono text-[11px] text-mute underline decoration-hair-3 underline-offset-[3px]">
                              Read the bill →
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
      {tip.node}
    </div>
  );
}
