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

export function Broadsheet() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("s");
  const compare = params.get("c");
  const drawer = !!selected;

  const [picking, setPicking] = useState(false);
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [panX, setPanX] = useState(0);
  const [animPan, setAnimPan] = useState(false);
  const [dragging, setDragging] = useState(false);
  const vpRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const counts = useMemo(() => countQuadrants(STATES), []);
  const byAbbr = useMemo(
    () => Object.fromEntries(STATES.map((s) => [s.abbr, s])),
    [],
  );

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

  useEffect(() => {
    setDetail(null);
  }, [selected, compare]);

  const baseDrawerPx = () => {
    if (typeof window === "undefined") return 560;
    const vw = window.innerWidth;
    return compare
      ? Math.max(560, Math.min(760, vw * 0.6))
      : Math.max(520, Math.min(560, vw * 0.4));
  };
  const detailPx = () => {
    if (!detail || typeof window === "undefined") return 0;
    return Math.max(0, Math.min(380, window.innerWidth - baseDrawerPx()));
  };
  const drawerWidth = drawer ? Math.min(
    typeof window !== "undefined" ? window.innerWidth : 1200,
    baseDrawerPx() + detailPx(),
  ) : 0;

  const maxShift = () => {
    const el = vpRef.current;
    if (!el || !drawerWidth) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, r.right - (window.innerWidth - drawerWidth) + 28);
  };

  const onSelect = (abbr: string) => {
    if (suppressClick.current) return;
    if (picking) {
      if (abbr === selected) {
        setPicking(false);
        return;
      }
      setQuery({ c: abbr });
      setPicking(false);
      return;
    }
    if (abbr === selected && drawer) return;
    setQuery({
      s: abbr,
      c: compare === abbr ? null : compare,
    });
  };

  const onPanStart = (e: React.MouseEvent) => {
    if (e.button !== 0 || !maxShift()) return;
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
      const next = Math.min(0, Math.max(-maxShift(), ox + dx));
      setPanX(next);
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
    setDetail(null);
    setAnimPan(true);
    setPanX(0);
  };

  const stageW =
    typeof window !== "undefined" ? window.innerWidth - drawerWidth : 1200;
  const showCaption = stageW >= 800;

  return (
    <div className="mx-auto min-h-screen max-w-[1480px] overflow-x-hidden px-9 py-7 pb-16 text-ink">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-[18px]">
        <h1 className="m-0 max-w-[920px] font-map-serif text-[clamp(34px,4.2vw,58px)] leading-none font-normal tracking-[-0.02em]">
          Where each state stands on{" "}
          <em className="font-light italic">compute</em> and{" "}
          <em className="font-light italic">regulation</em>
        </h1>
        <div className="flex gap-2">
          <Link
            href="/bills"
            className="border border-ink px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
          >
            Bill list
          </Link>
        </div>
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

        <div className="flex items-start justify-center font-map-mono text-[11px] text-mute">
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
          {showCaption && (
            <p className="ml-7 w-[340px] font-map-serif text-[14px] leading-[1.55] text-mute text-pretty">
              Color is the state&apos;s quadrant: data center posture (−3
              restricting to +3 accelerating) against AI regulation strength
              (0–6). Click a state to open its dossier; use Compare to pin a
              second state.
            </p>
          )}
        </div>
      </div>

      <div
        className="fixed top-0 right-0 bottom-0 z-10 grid overflow-hidden border-l border-ink bg-paper shadow-[-30px_0_60px_-40px_rgba(20,24,29,.45)] transition-[transform,width] duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{
          width: drawer ? drawerWidth : 0,
          maxWidth: "100vw",
          transform: drawer ? "translateX(0)" : "translateX(104%)",
          gridTemplateColumns: detail
            ? `${detailPx()}px minmax(0,1fr)`
            : "0px minmax(0,1fr)",
        }}
      >
        <DetailRail
          detail={detail}
          state={detail ? byAbbr[detail.abbr] : undefined}
          onClose={() => setDetail(null)}
          onDetail={setDetail}
        />
        <div className="min-w-0 overflow-y-auto px-7 pb-16">
          <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-hair bg-paper py-3.5 pb-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
            <span>{compare ? "State diff" : "State dossier"}</span>
            <div className="flex items-center gap-2">
              {compare ? (
                <>
                  <OutlineButton
                    onClick={() => setQuery({ s: compare, c: selected })}
                    aria-label="Swap"
                    className="flex h-7 w-7 items-center justify-center px-0"
                  >
                    ⇄
                  </OutlineButton>
                  <OutlineButton onClick={() => setQuery({ c: null })}>
                    Clear compare
                  </OutlineButton>
                </>
              ) : (
                <OutlineButton
                  active={picking}
                  onClick={() => setPicking((p) => !p)}
                >
                  {picking ? "Click a state…" : "Compare"}
                </OutlineButton>
              )}
              {selected && (
                <Link
                  href={`/state/${selected}${compare ? `?c=${compare}` : ""}`}
                  className="border border-ink px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
                >
                  Open
                </Link>
              )}
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
            <DiffView a={selected} b={compare} embedded />
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
