"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function OutlineButton({
  children,
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "border border-ink bg-transparent px-[10px] py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-white",
        active && "bg-ink text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Three-stop slider on the stance axis: left pole, both, right pole. The knob
 * follows the pointer while dragging and snaps to the nearest stop; the value
 * changes as soon as the nearest stop does. Above 560px the pole labels sit
 * at the track ends; at 560px and below all three sit under a fluid track.
 */
export function StanceSlider<K extends string>({
  value,
  stops,
  onChange,
  ariaLabel,
  className,
}: {
  value: K;
  /** [left pole, middle, right pole]. */
  stops: readonly [{ key: K; label: string }, { key: K; label: string }, { key: K; label: string }];
  onChange: (k: K) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Knob position (0..1) while dragging; null when resting on a stop.
  const [drag, setDrag] = useState<number | null>(null);
  const idx = Math.max(0, stops.findIndex((s) => s.key === value));
  const last = stops.length - 1;
  const pos = drag ?? idx / last;

  const set = (i: number) => {
    const k = stops[Math.min(last, Math.max(0, i))].key;
    if (k !== value) onChange(k);
  };
  const frac = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = frac(e.clientX);
    setDrag(f);
    set(Math.round(f * last));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    const f = frac(e.clientX);
    setDrag(f);
    set(Math.round(f * last));
  };
  const onPointerUp = () => setDrag(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const next =
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? idx - 1
      : e.key === "ArrowRight" || e.key === "ArrowUp" ? idx + 1
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    set(next);
  };

  const label = (i: number, extra?: string) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => set(i)}
      className={cn(
        "whitespace-nowrap font-map-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-200 hover:text-ink",
        i === idx ? "text-ink" : "text-dim",
        extra,
      )}
    >
      {stops[i].label}
    </button>
  );

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-center gap-[14px]">
        {label(0, "max-[560px]:hidden")}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={idx}
          aria-valuetext={stops[idx].label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          style={{ "--p": pos } as React.CSSProperties}
          className="group relative h-[22px] w-[200px] shrink-0 cursor-pointer touch-none outline-none xl:w-[132px] max-[560px]:h-9 max-[560px]:w-auto max-[560px]:flex-1"
        >
          <span
            className="absolute inset-x-0 top-[10px] h-[2px] max-[560px]:top-[17px]"
            style={{
              background: "linear-gradient(90deg, var(--color-axis-build), #e4e0d8, var(--color-axis-policy))",
            }}
          />
          <span className="absolute top-[6px] left-1/2 h-[10px] w-px bg-hair-3 max-[560px]:top-[13px]" />
          {/* On the fluid phone track the thumb is inset so it stays inside the ends. */}
          <span
            className="absolute top-[4px] left-[calc(var(--p)*100%)] -ml-[7px] size-[14px] rounded-full border-2 border-paper bg-ink shadow-[0_0_0_1px_var(--color-ink)] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ink max-[560px]:top-[9px] max-[560px]:left-[calc(9px+(100%-18px)*var(--p))] max-[560px]:-ml-[9px] max-[560px]:size-[18px]"
            style={{ transition: drag === null ? "left .25s cubic-bezier(.2,.7,.2,1)" : "none" }}
          />
        </div>
        {label(last, "max-[560px]:hidden")}
      </div>
      <div className="-mt-1 hidden grid-cols-3 max-[560px]:grid">
        {label(0, "justify-self-start py-1 text-[10px]")}
        {label(1, "justify-self-center py-1 text-[10px]")}
        {label(last, "justify-self-end py-1 text-[10px]")}
      </div>
    </div>
  );
}

/** One-line placeholder for a section with nothing to show (mono 12px, dim). */
export function EmptyNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("m-0 font-map-mono text-[12px] leading-[1.5] text-dim", className)}>{children}</p>
  );
}

export function OutlineSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "border border-ink bg-transparent px-[10px] py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function AccordionSection({
  title,
  note,
  open,
  onToggle,
  children,
  delay = "0s",
  bleed = 0,
}: {
  title: string;
  note?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  delay?: string;
  /** Horizontal padding (px) inside the clipped body so hover/active halos
   *  that bleed past the content edge are not cut off. */
  bleed?: number;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="map-fade-up flex w-full items-baseline justify-between gap-3 border-0 border-b border-ink bg-transparent py-[10px] pt-[22px] text-left text-ink"
        style={{ animationDelay: delay }}
      >
        <span className="font-map-serif text-[20px] font-normal">{title}</span>
        <span className="flex items-baseline gap-2.5 font-map-mono text-[11px] text-mute">
          {note}
          <span className="w-2.5 text-right text-[14px]">{open ? "−" : "+"}</span>
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-[380ms] ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div
          className="min-h-0 overflow-hidden transition-opacity duration-[280ms]"
          style={{
            opacity: open ? 1 : 0,
            padding: bleed ? `0 ${bleed}px` : undefined,
            margin: bleed ? `0 -${bleed}px` : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

export function SegmentBar({
  cells,
  height = 8,
  stagger = "center",
}: {
  cells: string[];
  height?: number;
  /** "center": recolor from the middle outward (posture); "ltr": left to right (AI). */
  stagger?: "center" | "ltr";
}) {
  const mid = Math.floor(cells.length / 2);
  return (
    <div
      className="grid gap-0.5"
      style={{
        gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
        height,
      }}
    >
      {cells.map((color, i) => (
        <span
          key={i}
          className="transition-colors duration-200"
          style={{
            background: color,
            transitionDelay: `${
              stagger === "center" ? Math.max(0, Math.abs(i - mid) - 1) * 70 : i * 70
            }ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Number roll (prototype `numOut`/`numIn`): the previous value slides up and
 * out while the new value slides in from below. `seq` alternates keyframe
 * names so consecutive changes restart the animation; pass `prev` undefined
 * to render statically.
 */
export function RollNumber({
  value,
  prev,
  seq,
  align = "start",
  className,
}: {
  value: string;
  prev?: string;
  seq: number;
  align?: "start" | "end";
  className?: string;
}) {
  const on = prev !== undefined;
  const ab = seq % 2 ? "a" : "b";
  return (
    <span
      className={cn("grid overflow-hidden", className)}
      style={{ justifyContent: align }}
    >
      {on && (
        <span
          className={`map-num-out-${ab}`}
          style={{ gridArea: "1 / 1", opacity: 0 }}
          aria-hidden
        >
          {prev}
        </span>
      )}
      <span className={on ? `map-num-in-${ab}` : undefined} style={{ gridArea: "1 / 1" }}>
        {value}
      </span>
    </span>
  );
}

export function GlyphTile({
  glyph,
  bg,
  border,
  icon,
  size = 32,
  fontSize = 13,
}: {
  glyph: string;
  bg: string;
  border: string;
  icon: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center leading-none transition-[background,border-color,color] duration-200"
      style={{
        width: size,
        height: size,
        background: bg,
        border: `1.5px solid ${border}`,
        color: icon,
        fontSize,
      }}
    >
      {glyph}
    </span>
  );
}

export function DotScale({
  tier,
  pending = false,
  inverted = false,
}: {
  tier: number;
  pending?: boolean;
  inverted?: boolean;
}) {
  const on = inverted ? "#fff" : "#14181D";
  const off = inverted ? "rgba(255,255,255,.3)" : "#D7DBE0";
  return (
    <span className="flex items-center gap-[3px]">
      {[1, 2, 3, 4].map((v) => {
        const filled = v <= tier;
        const hollow = pending && v === tier + 1;
        return (
          <span
            key={v}
            className="box-border rounded-full transition-[background,border-color] duration-[250ms]"
            style={{
              width: 7,
              height: 7,
              background: filled ? on : hollow ? "transparent" : off,
              border: `1px solid ${filled ? on : hollow ? (inverted ? "#fff" : "#5F6770") : off}`,
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * The posture × regulation square, filled with the Combined map's diverging
 * ramp on the diagonal (indigo top-left = restrict + strong AI, amber
 * bottom-right = accelerate + weak AI) so it doubles as that legend in two
 * dimensions. No divider lines: they would read as a mark on one quadrant.
 */
const NET_SQUARE =
  "linear-gradient(135deg,#51578F 0%,#7A80AE 17%,#A7ABCB 33%,#EDE9E2 50%,#D8B87E 67%,#B5813C 83%,#8A5A22 100%)";

export function QuadrantMini({
  posture,
  ai,
  size = 120,
  a,
  b,
}: {
  posture: number;
  ai: number;
  size?: number;
  a?: { posture: number; ai: number; color: string };
  b?: { posture: number; ai: number; color: string };
}) {
  const dual = !!(a && b);
  const pad = dual ? 10 : 12;
  const span = dual ? 80 : 76;
  const yBase = dual ? 90 : 88;
  const dot = (p: number, aiv: number) => ({
    left: `${(pad + ((p + 3) / 6) * span).toFixed(0)}%`,
    top: `${(yBase - (aiv / 6) * span).toFixed(0)}%`,
  });
  const single = dot(posture, ai);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5" style={{ width: size + 15 }}>
        <div
          className="relative shrink-0 font-map-mono text-[9px] uppercase tracking-[0.06em] text-mute"
          style={{ width: 9, height: size }}
        >
          {/* Inline transforms: the translate must run in the rotated frame,
              which Tailwind's separate rotate/translate properties cannot express. */}
          <span
            className="absolute top-0 left-0 leading-[9px] whitespace-nowrap"
            style={{ transformOrigin: "top left", transform: "rotate(-90deg) translateX(-100%)" }}
          >
            Strong
          </span>
          <span
            className="absolute bottom-0 left-0 leading-[9px] whitespace-nowrap"
            style={{ transformOrigin: "bottom left", transform: "rotate(-90deg) translateY(100%)" }}
          >
            Weak
          </span>
        </div>
        <div
          className="relative shrink-0 border border-ink box-border"
          style={{ width: size, height: size }}
        >
          {/* Faded under the two Diff dots so they stay the loudest thing on it. */}
          <span
            className="absolute inset-0"
            style={{ background: NET_SQUARE, opacity: dual ? 0.5 : 1 }}
          />
          {dual && a && b ? (
            <>
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-[650ms] ease-[cubic-bezier(.2,.7,.2,1)]"
                style={{
                  ...dot(a.posture, a.ai),
                  width: 12,
                  height: 12,
                  background: a.color,
                }}
              />
              <span
                className="absolute box-border -translate-x-1/2 -translate-y-1/2 bg-paper transition-[left,top] duration-[650ms] ease-[cubic-bezier(.2,.7,.2,1)]"
                style={{
                  ...dot(b.posture, b.ai),
                  width: 12,
                  height: 12,
                  border: `2.5px solid ${b.color}`,
                }}
              />
            </>
          ) : (
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 border-2 border-paper bg-ink transition-[left,top] duration-[650ms] ease-[cubic-bezier(.2,.7,.2,1)]"
              style={{ ...single, width: 10, height: 10 }}
            />
          )}
        </div>
      </div>
      <div
        className="flex justify-between pl-[15px] font-map-mono text-[9px] uppercase tracking-[0.06em] text-mute"
        style={{ width: size + 15 }}
      >
        <span>Restrict</span>
        <span>Accel</span>
      </div>
    </div>
  );
}
