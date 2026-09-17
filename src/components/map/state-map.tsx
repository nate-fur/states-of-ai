"use client";

import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import { STATES } from "@/lib/map/data";
import type { StateRecord } from "@/lib/map/types";

const LABEL_OFFSETS: Record<string, [number, number]> = {
  VT: [-8, -46],
  NH: [74, -30],
  MA: [74, -8],
  RI: [74, 14],
  CT: [62, 36],
  NJ: [52, 26],
  DE: [52, 34],
  MD: [44, 56],
};

type GeoShape = {
  abbr: string;
  d: string;
  cx: number;
  cy: number;
  lx: number;
  ly: number;
  leader: boolean;
};

export function StateMap({
  selected,
  compare,
  onSelect,
  panX = 0,
  animPan = false,
  cursor = "default",
  touchAction = "auto",
  onPanStart,
  onGeoReady,
  viewportRef,
}: {
  selected: string | null;
  compare: string | null;
  onSelect: (abbr: string) => void;
  panX?: number;
  animPan?: boolean;
  cursor?: string;
  touchAction?: "auto" | "pan-y";
  onPanStart?: (e: React.MouseEvent) => void;
  /** Fires after the state paths and labels have rendered. */
  onGeoReady?: () => void;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [geo, setGeo] = useState<GeoShape[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const byName = useMemo(
    () => Object.fromEntries(STATES.map((s) => [s.name, s])),
    [],
  );
  const byAbbr = useMemo(
    () => Object.fromEntries(STATES.map((s) => [s.abbr, s])),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/geo/states-10m.json");
      if (!res.ok) throw new Error(`geo fetch failed: ${res.status}`);
      // TopoJSON object typing is loose across atlas packages.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topo: any = await res.json();
      const fc = feature(topo, topo.objects.states) as unknown as FeatureCollection<
        Geometry,
        { name: string }
      >;
      fc.features = fc.features.filter((f) => byName[f.properties.name]);
      const proj = geoAlbersUsa().fitExtent(
        [
          [8, 8],
          [952, 592],
        ],
        fc,
      );
      const path = geoPath(proj);
      const shapes = fc.features.map((f) => {
        const st = byName[f.properties.name] as StateRecord;
        const centroid = path.centroid(f);
        const cx = centroid[0] ?? 0;
        const cy = centroid[1] ?? 0;
        const off = LABEL_OFFSETS[st.abbr];
        return {
          abbr: st.abbr,
          d: path(f) || "",
          cx,
          cy,
          lx: cx + (off ? off[0] : 0),
          ly: cy + (off ? off[1] : 0),
          leader: !!off,
        };
      });
      if (!cancelled) setGeo(shapes);
    })().catch((err) => {
      if (!cancelled) console.error("State map geometry failed to load", err);
    });
    return () => {
      cancelled = true;
    };
  }, [byName]);

  useEffect(() => {
    if (geo.length) onGeoReady?.();
  }, [geo, onGeoReady]);

  // Paths keep a stable DOM order. Hover/active strokes are drawn in an overlay
  // so a state is never re-inserted between mousedown and mouseup (which would
  // swallow the click on fast pointer moves and on touch).
  const shapes = useMemo(() => {
    return geo.map((g) => {
      const s = byAbbr[g.abbr]!;
      const active = g.abbr === selected || g.abbr === compare;
      const hov = hover === g.abbr;
      return {
        ...g,
        bg: s.q.color,
        active,
        hov,
        opacity: hover && !hov && !active ? 0.6 : 1,
      };
    });
  }, [geo, byAbbr, selected, compare, hover]);

  const leaders = shapes.filter((s) => s.leader);
  const outlines = [
    ...shapes.filter((s) => s.hov && !s.active),
    ...shapes.filter((s) => s.active),
  ];

  return (
    <div
      ref={viewportRef}
      onMouseDown={onPanStart}
      className="relative mx-auto aspect-[960/600] w-[min(100%,max(576px,calc((100vh-300px)*1.6)))] select-none"
      style={{ cursor, touchAction }}
    >
      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${panX}px,0)`,
          transition: animPan
            ? "transform .3s cubic-bezier(.2,.7,.2,1)"
            : "none",
        }}
      >
        <svg viewBox="0 0 960 600" className="block h-full w-full overflow-visible">
          {shapes.map((s) => (
            <path
              key={s.abbr}
              data-abbr={s.abbr}
              d={s.d}
              fill={s.bg}
              stroke="#F7F8FA"
              strokeWidth={1}
              strokeLinejoin="round"
              opacity={s.opacity}
              className="cursor-pointer transition-opacity duration-150"
              onClick={() => onSelect(s.abbr)}
              onMouseEnter={() => setHover(s.abbr)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {outlines.map((s) => (
            <path
              key={`o-${s.abbr}`}
              d={s.d}
              fill="none"
              stroke={s.active ? "#14181D" : "#F7F8FA"}
              strokeWidth={s.active ? 2.5 : 1.6}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}
          {leaders.map((l) => (
            <line
              key={`L-${l.abbr}`}
              x1={l.cx}
              y1={l.cy}
              x2={l.lx}
              y2={l.ly + (l.ly < l.cy ? 7 : -7)}
              stroke="#14181D"
              strokeWidth={0.8}
              opacity={0.6}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0">
          {shapes.map((s) => (
            <span
              key={`lbl-${s.abbr}`}
              onClick={() => onSelect(s.abbr)}
              onMouseEnter={() => setHover(s.abbr)}
              onMouseLeave={() => setHover(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer font-map-mono text-[clamp(9px,1.15vw,13px)] font-medium tracking-[0.04em] leading-none select-none pointer-events-auto"
              style={{
                left: `${(s.lx / 9.6).toFixed(2)}%`,
                top: `${(s.ly / 6).toFixed(2)}%`,
                color: s.leader ? "#14181D" : "#fff",
                textShadow: s.leader
                  ? "0 0 3px #F7F8FA"
                  : "0 0 3px rgba(20,24,29,0.7), 0 0 1px rgba(20,24,29,0.9)",
              }}
            >
              {s.abbr}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
