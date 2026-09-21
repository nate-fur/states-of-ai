"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SourceToggle, useMapData } from "./data-context";
import { countQuadrants } from "@/lib/map/derive";
import {
  MODES,
  MODE_COPY,
  MODE_TITLE,
  modeParam,
  parseMode,
  rampCounts,
  typedSegments,
  type MapMode,
} from "@/lib/map/mode";
import type { DetailSelection } from "@/lib/map/types";
import { DetailRail } from "./detail-rail";
import { BillReaderOverlay } from "@/components/bill/reader";
import { DiffView } from "./diff-view";
import { StateDossierPanel } from "./state-dossier-panel";
import { StateMap } from "./state-map";
import { useTypewriter } from "./motion";
import { OutlineButton, SegmentedControl } from "./ui";

const EASE = "cubic-bezier(.2,.7,.2,1)";
const CONTAINER_MAX = 1480;
const CONTAINER_PAD = 36;
// Spec (MAP_STAGE_AND_PANNING.md): symmetric pan margin, reveal comfort zone,
// first-open anchor, drag dead zone.
const EDGE = 48;
const REVEAL_PAD = 120;
const OPEN_ANCHOR = 0.5;
const DEAD_ZONE = 4;
// A pan range narrower than this is not worth a drag; pin the map instead.
const PAN_SLACK = 24;

// The handoff spec scales the drawer with the viewport (clamp(520, 40vw, 560)
// single / clamp(560, 60vw, 760) compare). That made the panel resize with the
// window, so it is pinned at the top of each range; the viewport cap below
// still applies on narrow screens.
function baseDrawerPx(compare: boolean): number {
  return compare ? 760 : 560;
}

type Geom = { panX: number; drawerPx: number; vw: number };
type Bounds = { lo: number; hi: number; canPan: boolean };

// URL state codes are user-editable: accept any case, reject unknown codes.
function stateParam(v: string | null, byAbbr: Record<string, unknown>): string | null {
  const abbr = v?.toUpperCase() ?? "";
  return byAbbr[abbr] ? abbr : null;
}

// Detail rail selection in the URL: "bill:SB 243" or "k:frontier".
function detailParam(v: string | null, abbr: string | null): DetailSelection | null {
  if (!v || !abbr) return null;
  const i = v.indexOf(":");
  if (i < 0) return null;
  const kind = v.slice(0, i);
  const id = v.slice(i + 1);
  if (kind === "bill" && id) return { abbr, bill: id };
  if (kind === "k" && id) return { abbr, k: id };
  return null;
}
function detailToParam(d: DetailSelection | null): string | null {
  if (!d) return null;
  return "bill" in d && d.bill ? `bill:${d.bill}` : "k" in d && d.k ? `k:${d.k}` : null;
}

// Union of every state path and label span inside the viewport, in window
// coords, normalised back to panX = 0. Labels are included because the offset
// NE labels (MA, NH, RI…) extend past the easternmost path. The rendered
// transform is read from the moving layer rather than taken from state: the
// layer may be mid-transition (or not yet transitioned at all), and subtracting
// the target position would skew the edges and double-apply the shift.
function renderedX(el: HTMLElement): number {
  const mover = el.firstElementChild as HTMLElement | null;
  return mover ? new DOMMatrix(getComputedStyle(mover).transform).m41 : 0;
}

function mapEdges(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const cur = renderedX(el);
  let mn = Infinity;
  let mx = -Infinity;
  el.querySelectorAll("path, span").forEach((p) => {
    const b = p.getBoundingClientRect();
    if (b.left < mn) mn = b.left;
    if (b.right > mx) mx = b.right;
  });
  if (mx === -Infinity) {
    mn = r.left;
    mx = r.right;
  }
  return { left: mn - cur, right: mx - cur };
}

// Pan bounds for view.x: lo = furthest left (−maxShift), hi = furthest right
// (minShift, ≤ 0). Both are 0 while the drawer is closed, which disables
// panning. When the map fits the stage (hi < lo) it pins to hi, hugging the
// window's left edge. A range smaller than PAN_SLACK is collapsed to its
// midpoint so the map can't wiggle a few pixels; the slack is split evenly
// between the two edge margins instead.
function panBounds(el: HTMLElement | null, g: Geom): Bounds {
  if (!el || !g.drawerPx) return { lo: 0, hi: 0, canPan: false };
  const e = mapEdges(el);
  let lo = -Math.max(0, e.right - (g.vw - g.drawerPx) + EDGE);
  let hi = Math.min(0, EDGE - e.left);
  if (hi < lo) lo = hi;
  else if (hi - lo < PAN_SLACK) lo = hi = (lo + hi) / 2;
  return { lo, hi, canPan: hi > lo };
}
function clampTo(b: Bounds, x: number): number {
  return Math.min(b.hi, Math.max(b.lo, x));
}
function clampX(el: HTMLElement | null, g: Geom, x: number): number {
  return clampTo(panBounds(el, g), x);
}

export function Broadsheet() {
  const router = useRouter();
  const params = useSearchParams();
  const { STATES } = useMapData();
  const byAbbr = useMemo(() => Object.fromEntries(STATES.map((s) => [s.abbr, s])), [STATES]);
  const selected = stateParam(params.get("s"), byAbbr);
  const rawCompare = stateParam(params.get("c"), byAbbr);
  const compare = rawCompare && rawCompare !== selected ? rawCompare : null;
  const drawer = !!selected;
  // Map mode lives in the URL (?mode=compute|reg) so a view can be linked;
  // Combined is the default and is omitted.
  const mode: MapMode = parseMode(params.get("mode"));

  const [picking, setPicking] = useState(false);
  // The rail keeps rendering the last selection while it slides closed, and a
  // selection is only live for the state/compare pair it was opened under.
  const [rail, setRail] = useState<{
    detail: DetailSelection | null;
    last: DetailSelection | null;
    s: string | null;
    c: string | null;
    seq: number;
  }>(() => {
    // A fresh load with ?d= restores the panel.
    const d = detailParam(params.get("d"), selected);
    return { detail: d, last: d, s: selected, c: compare, seq: d ? 1 : 0 };
  });
  const detail = rail.s === selected && rail.c === compare ? rail.detail : null;
  // Bill Reader overlay. `key` stays set while closed so the exit animation
  // plays; it is cleared when the drawer closes. ?r=1&f= restores it on load.
  const [reader, setReader] = useState<{ on: boolean; key: string | null; focus: string | null }>(() => {
    const d = detailParam(params.get("d"), selected);
    if (!d || params.get("r") !== "1" || !("bill" in d) || !d.bill) return { on: false, key: null, focus: null };
    const f = params.get("f");
    return { on: true, key: `${d.abbr}:${d.bill}`, focus: f ? `${f}|${Date.now()}` : null };
  });
  const [panX, setPanX] = useState(0);
  const [animPan, setAnimPan] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [canPan, setCanPan] = useState(false);
  // Bumped once the map's geometry has rendered so a fresh load with a state in
  // the URL re-clamps against real paths instead of the empty viewport.
  const [geoReady, setGeoReady] = useState(0);
  // The viewport is unknown until mount, so the SSR pass renders against a
  // placeholder. Width-dependent transitions stay off until the measured
  // layout has been committed, otherwise a fresh load with a state in the URL
  // tweens the drawer (and the stage margins) from the placeholder width.
  const [measuredVw, setVw] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const vw = measuredVw ?? 1280;
  const vpRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const pendingReveal = useRef<{ abbr: string; wasClosed: boolean } | null>(
    null,
  );
  // Bounds are cached per gesture: the DOM measurement is invariant while
  // dragging and too expensive to redo on every pointer move.
  const drag = useRef<{
    sx: number;
    sy: number;
    ox: number;
    moved: boolean;
    bounds: Bounds;
  } | null>(null);
  const counts = useMemo(() => countQuadrants(STATES), [STATES]);
  const ramp = useMemo(() => rampCounts(mode, STATES), [mode, STATES]);
  const copy = MODE_COPY[mode];
  // The H1 retypes when the mode changes (same effect as the dossier name):
  // erase back to the shared "Where each state stands on ", then type the rest.
  const titleSegs = MODE_TITLE[mode];
  const { text: typedTitle, caret: titleCaret } = useTypewriter(
    titleSegs.map((t) => t.text).join(""),
  );
  const titleParts = typedSegments(mode, typedTitle);

  useLayoutEffect(() => {
    const measure = () => setVw(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (settled || measuredVw === null) return;
    // Let the measured width paint before transitions turn on, so the browser
    // never sees the placeholder-to-measured change as a tween.
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, [settled, measuredVw]);


  // Drawer geometry (prototype: base width + detail rail, capped at the viewport).
  const base = baseDrawerPx(!!compare);
  const detailW = detail ? Math.max(0, Math.min(380, vw - base)) : 0;
  const drawerW = Math.min(vw, base + detailW);
  const drawerPx = drawer ? drawerW : 0;

  // Latest geometry for native (touch) listeners and rAF callbacks.
  const geom = useRef<Geom>({ panX, drawerPx, vw });
  useLayoutEffect(() => {
    geom.current = { panX, drawerPx, vw };
  });

  const setQuery = useCallback(
    (next: {
      s?: string | null;
      c?: string | null;
      d?: string | null;
      r?: string | null;
      f?: string | null;
      mode?: string | null;
    }) => {
      const p = new URLSearchParams(params.toString());
      for (const k of ["s", "c", "d", "r", "f", "mode"] as const) {
        const v = next[k];
        if (v === undefined) continue;
        if (v) p.set(k, v);
        else p.delete(k);
      }
      const q = p.toString();
      router.replace(q ? `/?${q}` : "/", { scroll: false });
    },
    [params, router],
  );

  const onGeoReady = useCallback(() => setGeoReady((n) => n + 1), []);

  const animateTo = useCallback((x: number) => {
    if (x === geom.current.panX) return;
    setAnimPan(true);
    setPanX(x);
  }, []);

  // After a selection (or a drawer width change) settles: reveal the requested
  // state, otherwise just keep the current pan inside the new bounds.
  //   first open  → selected state centred in the stage
  //   later picks → shift only if the state is within REVEAL_PAD of a stage edge
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = vpRef.current;
      const g = geom.current;
      const req = pendingReveal.current;
      pendingReveal.current = null;
      if (!el) return;
      setCanPan(panBounds(el, g).canPan);
      if (!drawer) return;
      if (!req) {
        animateTo(clampX(el, g, g.panX));
        return;
      }
      const p = el.querySelector<SVGPathElement>(
        `path[data-abbr="${req.abbr}"]`,
      );
      if (!p) return;
      // The rect is measured mid-animation if a pan is in flight; project it
      // to where the map is heading (state panX) before judging visibility.
      const r = p.getBoundingClientRect();
      const delta = g.panX - renderedX(el);
      const b = {
        left: r.left + delta,
        right: r.right + delta,
        width: r.width,
      };
      const visibleLeft = REVEAL_PAD;
      const visibleRight = g.vw - g.drawerPx - REVEAL_PAD;
      let target = g.panX;
      if (req.wasClosed) {
        const anchor = visibleLeft + (visibleRight - visibleLeft) * OPEN_ANCHOR;
        target = g.panX + (anchor - (b.left + b.width / 2));
      } else if (b.right > visibleRight)
        target = g.panX - (b.right - visibleRight);
      else if (b.left < visibleLeft) target = g.panX + (visibleLeft - b.left);
      else return;
      animateTo(clampX(el, g, target));
    });
    return () => cancelAnimationFrame(id);
  }, [selected, compare, drawer, drawerPx, vw, geoReady, animateTo]);

  const setRailDetail = useCallback((d: DetailSelection | null, s: string | null, c: string | null) => {
    setRail((r) => ({
      detail: d,
      last: d ?? r.last,
      s,
      c,
      seq: d ? r.seq + 1 : r.seq,
    }));
  }, []);
  const setDetail = (d: DetailSelection | null) => {
    setRailDetail(d, selected, compare);
    setReader((r) => ({ ...r, on: false, focus: null }));
    setQuery({ d: detailToParam(d), r: null, f: null });
  };

  // Reader flows (handoff section 4). The nonce lets the panel re-apply the
  // same focus twice; only the section id goes in the URL.
  const openReader = (key: string, focus?: string) => {
    setReader({ on: true, key, focus: focus ? `${focus}|${Date.now()}` : null });
    setQuery({ r: "1", f: focus ?? null });
  };
  const closeReader = useCallback(() => {
    setReader((r) => (r.on ? { ...r, on: false, focus: null } : r));
    setQuery({ r: null, f: null });
  }, [setQuery]);


  const onSelect = (abbr: string) => {
    if (suppressClick.current) return;
    if (picking) {
      if (abbr === selected) {
        setPicking(false);
        return;
      }
      pendingReveal.current = { abbr, wasClosed: false };
      setQuery({ c: abbr });
      setPicking(false);
      return;
    }
    if (abbr === selected && drawer) return;
    pendingReveal.current = { abbr, wasClosed: !drawer };
    setQuery({
      s: abbr,
      c: compare === abbr ? null : compare,
    });
  };

  const endDrag = (suppressMs: number) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d?.moved) {
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, suppressMs);
    }
  };

  const onPanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const bounds = panBounds(vpRef.current, geom.current);
    if (!bounds.canPan) return;
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: geom.current.panX,
      moved: false,
      bounds,
    };
    const move = (ev: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      if (!d.moved && Math.abs(dx) < DEAD_ZONE) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(true);
        setAnimPan(false);
      }
      setPanX(clampTo(d.bounds, d.ox + dx));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      endDrag(0);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Touch pan: same model with touches[0]. Attached natively so touchmove can
  // preventDefault (React registers touch listeners as passive). A gesture
  // that starts mostly vertical is handed back to the browser for page
  // scrolling (touch-action: pan-y) and never pans or suppresses a tap.
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const bounds = panBounds(el, geom.current);
      if (!bounds.canPan) return;
      const t = e.touches[0];
      drag.current = {
        sx: t.clientX,
        sy: t.clientY,
        ox: geom.current.panX,
        moved: false,
        bounds,
      };
    };
    const move = (e: TouchEvent) => {
      const d = drag.current;
      if (!d) return;
      const t = e.touches[0];
      const dx = t.clientX - d.sx;
      if (!d.moved) {
        const dy = t.clientY - d.sy;
        if (Math.abs(dx) < DEAD_ZONE) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          drag.current = null;
          return;
        }
        d.moved = true;
        setDragging(true);
        setAnimPan(false);
      }
      if (e.cancelable) e.preventDefault();
      setPanX(clampTo(d.bounds, d.ox + dx));
    };
    const end = () => endDrag(300);
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, []);

  const closeDrawer = () => {
    setReader({ on: false, key: null, focus: null });
    setQuery({ s: null, c: null, d: null, r: null, f: null });
    setPicking(false);
    setAnimPan(true);
    setPanX(0);
  };

  // Legend/caption follow the visible stage, not the full column.
  const side = Math.max(0, (vw - CONTAINER_MAX) / 2) + CONTAINER_PAD;
  const stageLeft = drawerPx ? -side : 0;
  const stageInset = drawerPx ? drawerPx - side : 0;
  const showCaption = vw - drawerPx >= 800;

  const compareLabel = picking
    ? "Click a state…"
    : compare
      ? "Clear compare"
      : "Compare";
  const detailState = rail.last ? byAbbr[rail.last.abbr] : undefined;

  return (
    <div className="mx-auto w-full min-h-screen max-w-[1480px] px-9 py-7 pb-16 text-ink">
      {/* Out of flow so the title row matches the design; sits under the drawer when it is open. */}
      <div className="fixed top-3.5 right-7 z-[5] flex items-center gap-2">
        <SourceToggle />
        <Link
          href="/scoring"
          className="border border-ink bg-paper px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
        >
          Scoring
        </Link>
        <Link
          href="/data"
          className="border border-ink bg-paper px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
        >
          Data
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-[18px]">
        <h1 className="relative m-0 font-map-serif text-[clamp(34px,4.2vw,58px)] leading-[1.06] font-normal tracking-[-0.02em]">
          {/* The longest title (Combined) reserves the box so the row and the
              toggle stay put while a shorter title is typed over it. */}
          <span className="invisible" aria-hidden>
            {MODE_TITLE.combined.map((t, i) =>
              t.em ? (
                <em key={i} className="font-light italic">
                  {t.text}
                </em>
              ) : (
                t.text
              ),
            )}
          </span>
          <span className="absolute inset-0">
            {titleParts.map((t, i) =>
              t.em ? (
                <em key={i} className="font-light italic">
                  {t.text}
                </em>
              ) : (
                t.text
              ),
            )}
            <span
              className="map-caret ml-[6px] inline-block h-[0.72em] w-[3px] translate-y-[0.06em] bg-ink"
              style={{ opacity: titleCaret ? 1 : 0 }}
              aria-hidden
            />
          </span>
        </h1>
        <SegmentedControl
          ariaLabel="Map mode"
          value={mode}
          options={MODES}
          onChange={(m) => setQuery({ mode: modeParam(m) })}
        />
      </div>

      <div className="flex flex-col gap-5 pt-7">
        <StateMap
          selected={selected}
          compare={compare}
          onSelect={onSelect}
          mode={mode}
          panX={panX}
          animPan={animPan}
          cursor={dragging ? "grabbing" : canPan ? "grab" : "default"}
          touchAction={drawer ? "pan-y" : "auto"}
          onPanStart={onPanStart}
          onGeoReady={onGeoReady}
          viewportRef={vpRef}
        />

        <div
          className="flex items-start justify-center font-map-mono text-[11px] text-mute"
          style={{
            marginLeft: stageLeft,
            marginRight: stageInset,
            transition: settled ? `margin .45s ${EASE}` : "none",
          }}
        >
          {mode === "combined" ? (
            <div
              className="grid items-stretch gap-1"
              style={{
                gridTemplateColumns: "auto 1fr 1fr",
                gridTemplateRows: "auto 34px 34px",
              }}
            >
              <div />
              <div className="text-center text-[10px] uppercase tracking-[0.08em]">
                Few DCs
              </div>
              <div className="text-center text-[10px] uppercase tracking-[0.08em]">
                Many DCs
              </div>
              <div className="self-center pr-1.5 text-[9px] uppercase tracking-[0.06em] leading-none whitespace-nowrap">
                Strong AI
              </div>
              <div className="flex min-w-[130px] items-center justify-between gap-3 bg-q-brakes px-2.5 text-white">
                <span>Full brakes</span>
                <span>{counts.brakes}</span>
              </div>
              <div className="flex min-w-[130px] items-center justify-between gap-3 bg-q-regulate px-2.5 text-white">
                <span>Build &amp; regulate</span>
                <span>{counts.regulate}</span>
              </div>
              <div className="self-center pr-1.5 text-[9px] uppercase tracking-[0.06em] leading-none whitespace-nowrap">
                Weak AI
              </div>
              <div className="flex min-w-[130px] items-center justify-between gap-3 bg-q-slow px-2.5 text-white">
                <span>Slow lane</span>
                <span>{counts.slow}</span>
              </div>
              <div className="flex min-w-[130px] items-center justify-between gap-3 bg-q-throttle px-2.5 text-white">
                <span>Full throttle</span>
                <span>{counts.throttle}</span>
              </div>
            </div>
          ) : (
            <div className="flex w-[308px] flex-col gap-[5px]">
              <div className="text-[10px] uppercase tracking-[0.08em]">{copy.axisTitle}</div>
              <div className="flex gap-[3px]">
                {ramp.map((r, i) => (
                  <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="h-[26px] w-full" style={{ background: r.color }} />
                    <span className="text-[10px] text-mute">{r.n}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] uppercase tracking-[0.06em] text-dim">
                <span>{copy.axisLow}</span>
                <span>{copy.axisHigh}</span>
              </div>
            </div>
          )}
          <p
            className="m-0 flex-none overflow-hidden font-map-serif text-[14px] leading-[1.55] text-mute"
            style={{
              marginLeft: showCaption ? 28 : 0,
              width: showCaption ? 340 : 0,
              opacity: showCaption ? 1 : 0,
              transition: settled
                ? `opacity .3s ease, width .45s ${EASE}, margin .45s ${EASE}`
                : "none",
            }}
          >
            <span className="block w-[340px] text-pretty">{copy.caption}</span>
          </p>
        </div>
      </div>

      <div
        className="fixed top-0 right-0 bottom-0 z-10 grid overflow-hidden border-l border-ink bg-paper shadow-[-30px_0_60px_-40px_rgba(20,24,29,.45)]"
        style={{
          width: drawerW,
          maxWidth: "100vw",
          transform: drawer ? "translateX(0)" : "translateX(104%)",
          gridTemplateColumns: `${detailW}px minmax(0,1fr)`,
          transition: settled
            ? `transform .45s ${EASE}, width .4s ${EASE}, grid-template-columns .4s ${EASE}`
            : `transform .45s ${EASE}`,
        }}
      >
        {/* The rail stays mounted (with the last selection) so the column can
            slide out from behind the dossier instead of popping in. */}
        <div
          className="grid min-w-0 overflow-hidden"
          style={{ opacity: detail ? 1 : 0, transition: "opacity .3s ease" }}
          aria-hidden={!detail}
        >
          <DetailRail
            detail={rail.last}
            state={detailState}
            onClose={() => setDetail(null)}
            onDetail={setDetail}
            onOpenReader={openReader}
            animKey={rail.seq}
            widthClass="w-[380px]"
          />
        </div>
        <div className="min-w-0 overflow-y-auto px-7 pb-10">
          <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-hair bg-paper py-3.5 pb-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
            <span>{compare ? "State diff" : "State dossier"}</span>
            <div className="flex items-center gap-2">
              {compare && (
                <OutlineButton
                  onClick={() => setQuery({ s: compare, c: selected })}
                  aria-label="Swap"
                  className="flex h-7 w-7 items-center justify-center px-0 text-[14px]"
                >
                  ⇄
                </OutlineButton>
              )}
              <OutlineButton
                active={picking}
                className="whitespace-nowrap"
                onClick={() =>
                  compare
                    ? (setQuery({ c: null }), setPicking(false))
                    : setPicking((p) => !p)
                }
              >
                {compareLabel}
              </OutlineButton>
              <OutlineButton
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center px-0 text-base leading-none"
                onClick={closeDrawer}
              >
                ×
              </OutlineButton>
            </div>
          </div>

          {compare && selected && byAbbr[selected] && byAbbr[compare] ? (
            <div className="map-diff-fade">
              <DiffView a={selected} b={compare} embedded />
            </div>
          ) : selected && byAbbr[selected] ? (
            <StateDossierPanel
              state={byAbbr[selected]}
              detail={detail}
              onDetail={setDetail}
              defaultOpen={{ policy: true, ai: false, local: false }}
              mode={mode}
            />
          ) : null}
        </div>
      </div>

      <BillReaderOverlay open={reader.on && drawer} billKey={drawer ? reader.key : null} focus={reader.focus} onClose={closeReader} />
    </div>
  );
}
