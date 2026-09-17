"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { STATES } from "@/lib/map/data";
import { countQuadrants } from "@/lib/map/derive";
import type { DetailSelection } from "@/lib/map/types";
import { DetailRail } from "./detail-rail";
import { DiffView } from "./diff-view";
import { StateDossierPanel } from "./state-dossier-panel";
import { StateMap } from "./state-map";
import { OutlineButton } from "./ui";

const EASE = "cubic-bezier(.2,.7,.2,1)";
const CONTAINER_MAX = 1480;
const CONTAINER_PAD = 36;
const STAGE_GUTTER = 28;

const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(hi, v));

function baseDrawerPx(vw: number, compare: boolean): number {
  return compare ? clamp(560, vw * 0.6, 760) : clamp(520, vw * 0.4, 560);
}

export function Broadsheet() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("s");
  const compare = params.get("c");
  const drawer = !!selected;

  const [picking, setPicking] = useState(false);
  // The rail keeps rendering the last selection while it slides closed, and a
  // selection is only live for the state/compare pair it was opened under.
  const [rail, setRail] = useState<{
    detail: DetailSelection | null;
    last: DetailSelection | null;
    s: string | null;
    c: string | null;
    seq: number;
  }>({ detail: null, last: null, s: null, c: null, seq: 0 });
  const detail = rail.s === selected && rail.c === compare ? rail.detail : null;
  const [panX, setPanX] = useState(0);
  const [animPan, setAnimPan] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [vw, setVw] = useState(1280);
  const vpRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const pendingReveal = useRef<{ abbr: string; wasClosed: boolean } | null>(null);
  const counts = useMemo(() => countQuadrants(STATES), []);

  useEffect(() => {
    const measure = () => setVw(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const byAbbr = useMemo(
    () => Object.fromEntries(STATES.map((s) => [s.abbr, s])),
    [],
  );

  // Drawer geometry (prototype: base width + detail rail, capped at the viewport).
  const base = baseDrawerPx(vw, !!compare);
  const detailW = detail ? Math.max(0, Math.min(380, vw - base)) : 0;
  const drawerW = Math.min(vw, base + detailW);
  const drawerPx = drawer ? drawerW : 0;


  const setQuery = useCallback(
    (next: { s?: string | null; c?: string | null }) => {
      const p = new URLSearchParams(params.toString());
      if (next.s !== undefined) {
        if (next.s) p.set("s", next.s);
        else p.delete("s");
      }
      if (next.c !== undefined) {
        if (next.c) p.set("c", next.c);
        else p.delete("c");
      }
      const q = p.toString();
      router.replace(q ? `/?${q}` : "/", { scroll: false });
    },
    [params, router],
  );

  const maxShift = useCallback(
    (shiftX: number, drawerWidth: number) => {
      const el = vpRef.current;
      if (!el || !drawerWidth) return 0;
      let right = el.getBoundingClientRect().right;
      let mx = 0;
      el.querySelectorAll("svg path").forEach((p) => {
        const r = p.getBoundingClientRect().right;
        if (r > mx) mx = r;
      });
      if (mx) right = mx - shiftX;
      return Math.max(0, right - (vw - drawerWidth) + STAGE_GUTTER);
    },
    [vw],
  );

  // Auto-shift the map so the chosen state stays visible beside the drawer:
  // on open it lands ~30% into the visible stage; on switch it only moves if hidden.
  useEffect(() => {
    const req = pendingReveal.current;
    if (!req || !drawer) return;
    pendingReveal.current = null;
    const id = requestAnimationFrame(() => {
      const el = vpRef.current;
      const p = el?.querySelector<SVGPathElement>(`path[data-abbr="${req.abbr}"]`);
      if (!el || !p) return;
      const b = p.getBoundingClientRect();
      const visibleRight = vw - drawerPx - STAGE_GUTTER;
      const visibleLeft = STAGE_GUTTER;
      let target = panX;
      if (req.wasClosed) {
        const stageW = visibleRight - visibleLeft;
        const anchor = visibleLeft + stageW * 0.3;
        target = panX + (anchor - (b.left + b.width / 2));
      } else if (b.right > visibleRight) target = panX - (b.right - visibleRight);
      else if (b.left < visibleLeft) target = panX + (visibleLeft - b.left);
      else return;
      setAnimPan(true);
      setPanX(clamp(-maxShift(panX, drawerPx), target, 0));
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, compare, drawerPx]);

  // Opening or closing the rail changes the drawer width; keep the pan in bounds.
  const setDetail = (d: DetailSelection | null) => {
    setRail((r) => ({
      detail: d,
      last: d ?? r.last,
      s: selected,
      c: compare,
      seq: d ? r.seq + 1 : r.seq,
    }));
    if (!drawer) return;
    const nextDetailW = d ? Math.max(0, Math.min(380, vw - base)) : 0;
    const next = clamp(-maxShift(panX, Math.min(vw, base + nextDetailW)), panX, 0);
    if (next !== panX) {
      setAnimPan(true);
      setPanX(next);
    }
  };

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

  const onPanStart = (e: React.MouseEvent) => {
    if (e.button !== 0 || !maxShift(panX, drawerPx)) return;
    const startX = e.clientX;
    const ox = panX;
    let moved = false;
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) < 4) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        setAnimPan(false);
      }
      setPanX(clamp(-maxShift(ox, drawerPx), ox + dx, 0));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setDragging(false);
      if (moved) {
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const closeDrawer = () => {
    setQuery({ s: null, c: null });
    setPicking(false);
    setAnimPan(true);
    setPanX(0);
  };

  // Legend/caption sit centered in the visible stage, not the full container.
  const side = Math.max(0, (vw - CONTAINER_MAX) / 2) + CONTAINER_PAD;
  const stageLeft = drawerPx ? -side : 0;
  const stageInset = drawerPx ? drawerPx - side : 0;
  const showCaption = vw - drawerPx >= 800;

  const compareLabel = picking ? "Click a state…" : compare ? "Clear compare" : "Compare";
  const detailState = rail.last ? byAbbr[rail.last.abbr] : undefined;

  return (
    <div className="mx-auto min-h-screen max-w-[1480px] overflow-x-hidden px-9 py-7 pb-16 text-ink">
      {/* Out of flow so the title row matches the design; sits under the drawer when it is open. */}
      <Link
        href="/bills"
        className="fixed top-3.5 right-7 z-[5] border border-ink bg-paper px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
      >
        Bill list
      </Link>

      <div className="border-b border-ink pb-[18px]">
        <h1 className="m-0 font-map-serif text-[clamp(34px,4.2vw,58px)] leading-none font-normal tracking-[-0.02em]">
          Where each state stands on{" "}
          <em className="font-light italic">compute</em> and{" "}
          <em className="font-light italic">regulation</em>
        </h1>
      </div>

      <div className="flex flex-col gap-5 pt-7">
        <StateMap
          selected={selected}
          compare={compare}
          onSelect={onSelect}
          panX={panX}
          animPan={animPan}
          cursor={dragging ? "grabbing" : drawer ? "grab" : "default"}
          onPanStart={onPanStart}
          viewportRef={vpRef}
        />

        <div
          className="flex items-start justify-center font-map-mono text-[11px] text-mute"
          style={{
            marginLeft: stageLeft,
            marginRight: stageInset,
            transition: `margin .45s ${EASE}`,
          }}
        >
          <div
            className="grid items-stretch gap-1"
            style={{
              gridTemplateColumns: "auto 1fr 1fr",
              gridTemplateRows: "auto 34px 34px",
            }}
          >
            <div />
            <div className="text-center text-[10px] uppercase tracking-[0.08em]">
              Restrict DCs
            </div>
            <div className="text-center text-[10px] uppercase tracking-[0.08em]">
              Accelerate DCs
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
          <p
            className="m-0 flex-none overflow-hidden font-map-serif text-[14px] leading-[1.55] text-mute"
            style={{
              marginLeft: showCaption ? 28 : 0,
              width: showCaption ? 340 : 0,
              opacity: showCaption ? 1 : 0,
              transition: `opacity .3s ease, width .45s ${EASE}, margin .45s ${EASE}`,
            }}
          >
            <span className="block w-[340px] text-pretty">
              Color is the state&apos;s quadrant: data center posture (−3
              restricting to +3 accelerating) against AI regulation strength
              (0–6). Click a state to open its dossier; use Compare to pin a
              second state.
            </span>
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
          transition: `transform .45s ${EASE}, width .4s ${EASE}, grid-template-columns .4s ${EASE}`,
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
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
