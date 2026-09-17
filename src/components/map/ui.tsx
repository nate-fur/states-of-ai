"use client";

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
}: {
  title: string;
  note?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  delay?: string;
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
          style={{ opacity: open ? 1 : 0 }}
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
}: {
  cells: string[];
  height?: number;
}) {
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
            transitionDelay: `${Math.abs(i - Math.floor(cells.length / 2)) * 70}ms`,
          }}
        />
      ))}
    </div>
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
      className="flex shrink-0 items-center justify-center leading-none"
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
            className="box-border rounded-full transition-colors duration-200"
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

export function QuadrantMini({
  posture,
  ai,
  activeKey,
  size = 120,
  a,
  b,
}: {
  posture: number;
  ai: number;
  activeKey?: string;
  size?: number;
  a?: { posture: number; ai: number; color: string };
  b?: { posture: number; ai: number; color: string };
}) {
  const dual = !!(a && b);
  const opacity = (key: string) =>
    dual ? 0.22 : activeKey === key ? 0.9 : 0.25;
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
          <span className="absolute top-0 left-0 origin-top-left -rotate-90 -translate-x-full leading-[9px] whitespace-nowrap">
            Strong
          </span>
          <span className="absolute bottom-0 left-0 origin-bottom-left -rotate-90 translate-y-full leading-[9px] whitespace-nowrap">
            Weak
          </span>
        </div>
        <div
          className="relative grid shrink-0 grid-cols-2 grid-rows-2 border border-ink box-border"
          style={{ width: size, height: size }}
        >
          <span style={{ background: "#5C62A8", opacity: opacity("brakes") }} />
          <span style={{ background: "#4A8C82", opacity: opacity("regulate") }} />
          <span style={{ background: "#B0776A", opacity: opacity("slow") }} />
          <span style={{ background: "#D4A15E", opacity: opacity("throttle") }} />
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
