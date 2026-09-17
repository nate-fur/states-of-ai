"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Intro animation delay in ms. */
  delay: number;
};

const INTRO_SWEEP_MS = 500;
const INTRO_JITTER_MS = 80;
const INTRO_STATE_MS = 400;
const INTRO_LABEL_LAG_MS = 250;

/** Deterministic 0–1 hash of a centroid y so neighbours don't fire in lockstep. */
function jitter(cy: number) {
  const x = Math.sin(cy * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

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
  // Intro sweep runs once per mount: direction is picked at random and cached
  // so re-renders from hover/select/pan never restart it.
  const introDir = useRef<number | null>(null);
  const introEnded = useRef(0);
  const [introDone, setIntroDone] = useState(false);
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
      const centroids = fc.features.map((f) => {
        const c = path.centroid(f);
        return [c[0] ?? 0, c[1] ?? 0] as const;
      });
      const xs = centroids.map((c) => c[0]);
      const ys = centroids.map((c) => c[1]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      // 0 W→E, 1 E→W, 2 N→S, 3 S→N.
      const dir = (introDir.current ??= Math.floor(Math.random() * 4));
      const shapes = fc.features.map((f, i) => {
        const st = byName[f.properties.name] as StateRecord;
        const [cx, cy] = centroids[i]!;
        const px = x1 > x0 ? (cx - x0) / (x1 - x0) : 0;
        const py = y1 > y0 ? (cy - y0) / (y1 - y0) : 0;
        const progress = [px, 1 - px, py, 1 - py][dir]!;
        const off = LABEL_OFFSETS[st.abbr];
        return {
          abbr: st.abbr,
          d: path(f) || "",
          cx,
          cy,
          lx: cx + (off ? off[0] : 0),
          ly: cy + (off ? off[1] : 0),
          leader: !!off,
          delay: Math.round(
            progress * INTRO_SWEEP_MS + jitter(cy) * INTRO_JITTER_MS,
          ),
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

  // Safety net: if an animationend never arrives (e.g. reduced-motion or a
  // throttled background tab), still release the intro so hover styling works.
  useEffect(() => {
    if (!geo.length || introDone) return;
    const longest = Math.max(...geo.map((g) => g.delay));
    const t = window.setTimeout(
      () => setIntroDone(true),
      longest + INTRO_LABEL_LAG_MS + INTRO_STATE_MS + 500,
    );
    return () => window.clearTimeout(t);
  }, [geo, introDone]);

  const onStateAnimationEnd = () => {
    introEnded.current += 1;
    if (introEnded.current >= geo.length) setIntroDone(true);
  };

  // `both` fill mode pins opacity:1 after the intro, which would override the
  // hover-dimming opacity attribute, so everything is set to `none` once done.
  const stateAnim = (delay: number) =>
    introDone
      ? "none"
      : `stateIn ${INTRO_STATE_MS}ms cubic-bezier(.2,.7,.2,1) ${delay}ms both`;
  const labelAnim = (delay: number) =>
    introDone
      ? "none"
      : `labelIn .3s ease ${delay + INTRO_LABEL_LAG_MS}ms both`;

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
              style={{
                animation: stateAnim(s.delay),
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
              onAnimationEnd={onStateAnimationEnd}
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
              // A selection present at load (state in the URL) rides in with
              // its state instead of appearing before it; after the intro the
              // outline is immediate.
              style={
                s.active
                  ? {
                      animation: stateAnim(s.delay),
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    }
                  : undefined
              }
            />
          ))}
          {/* Group opacity keeps the 0.6 tint while labelIn animates the line's own opacity. */}
          <g opacity={0.6}>
            {leaders.map((l) => (
              <line
                key={`L-${l.abbr}`}
                x1={l.cx}
                y1={l.cy}
                x2={l.lx}
                y2={l.ly + (l.ly < l.cy ? 7 : -7)}
                stroke="#14181D"
                strokeWidth={0.8}
                style={{ animation: labelAnim(l.delay) }}
              />
            ))}
          </g>
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
                animation: labelAnim(s.delay),
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
