"use client";

import { buildDetail } from "@/lib/map/derive";
import { STATES } from "@/lib/map/data";
import type { DetailSelection, StateRecord } from "@/lib/map/types";
import { GlyphTile, OutlineButton } from "./ui";

export function DetailRail({
  detail,
  state,
  onClose,
  onDetail,
  widthClass = "w-[380px] max-w-full",
  animKey = 0,
  className = "",
}: {
  detail: DetailSelection | null;
  state: StateRecord | undefined;
  onClose: () => void;
  onDetail: (d: DetailSelection) => void;
  widthClass?: string;
  /** Alternate on each new selection so the entrance stagger re-runs. */
  animKey?: number;
  className?: string;
}) {
  const data = buildDetail(detail, state, STATES);
  const anim = animKey % 2 === 0 ? "map-fade-up-a" : "map-fade-up-b";
  if (!data) return null;

  return (
    <div className={`min-w-0 overflow-x-hidden overflow-y-auto border-r border-hair bg-paper-2 ${className}`}>
      <div className={`flex flex-col gap-[22px] px-7 pb-12 ${widthClass}`}>
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-hair bg-paper-2 py-3.5 pb-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
          <span>
            {data.stateName} · {data.kind === "bill" ? "bill" : "policy"}
          </span>
          <OutlineButton aria-label="Close" className="flex h-7 w-7 items-center justify-center px-0 text-base leading-none" onClick={onClose}>
            ×
          </OutlineButton>
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
          <div className="flex flex-col gap-1">
            <h3 className="m-0 font-map-serif text-[28px] leading-none font-normal tracking-[-0.02em]">
              {data.label}
            </h3>
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
            <p
              className={`${anim} m-0 font-map-serif text-[22px] leading-[1.25] tracking-[-0.01em] text-pretty`}
              style={{ animationDelay: "0.35s" }}
            >
              {data.title}
            </p>
            <div className={`${anim} flex flex-col`} style={{ animationDelay: "0.42s" }}>
              <div className="flex justify-between border-b border-ink pb-2 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                <span>Policy buckets</span>
                <span>{data.buckets.length}</span>
              </div>
              {data.buckets.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => onDetail({ abbr: data.abbr, k: t.k })}
                  className="grid items-start gap-x-3.5 gap-y-1 border-0 border-b border-hair bg-transparent px-1.5 py-3 -mx-1.5 text-left text-ink hover:bg-hover-2"
                  style={{ gridTemplateColumns: "32px 1fr" }}
                >
                  <GlyphTile glyph={t.glyph} bg={t.bg} border={t.border} icon={t.iconColor} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-map-mono text-[13px]">{t.label}</span>
                    <span className="text-[14px] leading-[1.4] text-mute text-pretty">
                      {t.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p
              className={`${anim} m-0 font-map-serif text-base leading-[1.5] text-ink-2 text-pretty`}
              style={{ animationDelay: "0.35s" }}
            >
              {data.desc}
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
                  <div
                    key={b.n}
                    className="grid items-baseline gap-x-3.5 gap-y-1 border-b border-hair py-3"
                    style={{ gridTemplateColumns: "78px 1fr" }}
                  >
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener"
                      className="whitespace-nowrap font-map-mono text-[13px] font-medium"
                    >
                      {b.n}
                    </a>
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <span className="text-[15px] leading-[1.35] text-pretty">{b.t}</span>
                      <span className="font-map-mono text-[11px]" style={{ color: b.color }}>
                        {b.s} · {b.d}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <div
          className={`${anim} flex gap-3 font-map-mono text-[11px] text-mute`}
          style={{ animationDelay: "0.49s" }}
        >
          <a href={data.iappUrl} target="_blank" rel="noopener" className="text-mute">
            IAPP tracker
          </a>
          <a href={data.legiscanUrl} target="_blank" rel="noopener" className="text-mute">
            LegiScan search
          </a>
        </div>
      </div>
    </div>
  );
}
