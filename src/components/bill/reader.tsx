"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "./use-mounted";
import { cite, countText, parseBill, type BillLine } from "@/lib/bill/parse";
import { displayTitle, type BillDetail } from "@/lib/bill/types";
import { useMapData } from "@/components/map/data-context";
import { InfoDot, useInfoTip } from "./info-tip";
import { useBillDetail } from "./use-bill-detail";

// The Bill Reader (handoff section 3). One component rendered two ways:
// embedded in the map as an overlay, or standalone at /bill/[state]/[number].
// The left rail lists takeaways grouped by regulation area; the right column
// is the parsed text. Selecting a takeaway highlights the provisions it cites
// and dims everything else.

const EASE_STD = "cubic-bezier(.4,0,.2,1)";
const EASE_OUT = "cubic-bezier(.2,.7,.2,1)";
const HL_BG = "rgba(212,161,94,.18)";

type Flat = {
  k: string; // regulation area key
  orig: number;
  title: string;
  text: string;
  ids: string[];
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function scrollWithin(el: HTMLElement, container: HTMLElement | null, offset: number) {
  if (container) {
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - offset;
    container.scrollTo({ top, behavior: "smooth" });
  } else {
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  }
}

export function BillReader({
  bill,
  data,
  loading = false,
  focus = null,
  embedded = false,
  onClose,
  dimOthers = true,
}: {
  /** "CA:SB 243" */
  bill: string;
  data: BillDetail | null;
  loading?: boolean;
  /** "<sectionId>|<nonce>": select that takeaway and scroll both columns. */
  focus?: string | null;
  embedded?: boolean;
  onClose?: () => void;
  dimOthers?: boolean;
}) {
  const { STATES, AREAS } = useMapData();
  const tip = useInfoTip();
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const [abbr, number] = bill.split(":");
  const stateName = STATES.find((s) => s.abbr === abbr)?.name ?? abbr;
  const areaOf = useMemo(() => Object.fromEntries(AREAS.map((a) => [a.k, a])), [AREAS]);

  const text = data?.text ?? null;
  const lines: BillLine[] = useMemo(() => (text ? parseBill(text) : []), [text]);
  const pos = useMemo(() => Object.fromEntries(lines.map((l, i) => [l.id, i])), [lines]);

  // Takeaways in order of first appearance in the text; grouped by area below.
  const T: Flat[] = useMemo(() => {
    const flat: Flat[] = [];
    for (const a of data?.regulationAreas ?? []) {
      for (const t of a.takeaways) flat.push({ k: a.regulationArea, orig: flat.length, title: t.title, text: t.text, ids: t.sectionIds });
    }
    const at = (t: Flat) => (t.ids[0] !== undefined ? (pos[t.ids[0]] ?? 1e9) : 1e9);
    return flat.sort((a, b) => at(a) - at(b));
  }, [data, pos]);
  const supp = useMemo(() => {
    const out: Record<string, number[]> = {};
    T.forEach((t, i) => t.ids.forEach((id) => (out[id] ??= []).push(i)));
    return out;
  }, [T]);

  const scrollToId = (domId: string, offset: number) => {
    const el = document.getElementById(domId);
    if (!el) return;
    scrollWithin(el, embedded ? rootRef.current : null, offset);
  };

  // Selection state, keyed by bill so a new bill starts clean, with the host
  // focus applied during render (derived state) rather than in an effect.
  type Sel = { bill: string; activeT: number | null; closedG: Record<string, boolean>; focusApplied: string | null };
  const [sel, setSel] = useState<Sel>({ bill, activeT: null, closedG: {}, focusApplied: null });
  let cur: Sel = sel;
  if (cur.bill !== bill) cur = { bill, activeT: null, closedG: {}, focusApplied: null };
  if (focus && data && cur.focusApplied !== focus) {
    const id = focus.split("|")[0];
    const i = T.findIndex((t) => t.ids[0] === id);
    cur = i >= 0 ? { ...cur, focusApplied: focus, activeT: i, closedG: { ...cur.closedG, [T[i]!.k]: false } } : { ...cur, focusApplied: focus };
  }
  if (cur !== sel) setSel(cur);
  const { activeT, closedG } = cur;
  const setActiveT = (next: number | null | ((c: number | null) => number | null)) =>
    setSel((s) => ({ ...s, activeT: typeof next === "function" ? next(s.activeT) : next }));
  const setClosedG = (fn: (c: Record<string, boolean>) => Record<string, boolean>) =>
    setSel((s) => ({ ...s, closedG: fn(s.closedG) }));

  // Once a focus has been applied, bring the passage and the rail row into view.
  const focusApplied = cur.focusApplied;
  useEffect(() => {
    if (!focusApplied) return;
    const id = focusApplied.split("|")[0];
    const timer = setTimeout(() => {
      scrollToId("bt-" + id, 140);
      const row = document.getElementById("tk-" + id);
      const rail = railRef.current;
      if (row && rail) {
        rail.scrollTo({
          top: row.getBoundingClientRect().top - rail.getBoundingClientRect().top + rail.scrollTop - 120,
          behavior: "smooth",
        });
      }
    }, 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusApplied]);

  // Esc clears the active takeaway first, then closes the embedded reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeT !== null) setSel((s) => ({ ...s, activeT: null }));
      else if (embedded && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeT, embedded, onClose]);

  const activate = (i: number) => {
    const next = activeT === i ? null : i;
    setActiveT(next);
    if (next !== null) {
      const t = T[next]!;
      setClosedG((s) => ({ ...s, [t.k]: false }));
      if (t.ids[0]) setTimeout(() => scrollToId("bt-" + t.ids[0], 140), 30);
    }
  };

  // Groups ordered by where each area's first takeaway falls in the text.
  const groups = useMemo(() => {
    const keys = (data?.regulationAreas ?? []).map((a) => a.regulationArea);
    return keys
      .map((k) => {
        const items = T.map((t, i) => ({ t, i })).filter(({ t }) => t.k === k);
        const first = items[0]?.t.ids[0];
        return {
          k,
          items,
          summary: data?.regulationAreas.find((a) => a.regulationArea === k)?.summary ?? "",
          first: first !== undefined ? (pos[first] ?? 1e9) : 1e9,
        };
      })
      .sort((a, b) => a.first - b.first);
  }, [data, T, pos]);

  const active = activeT !== null ? T[activeT] : null;
  const counts = text ? countText(text, lines) : null;
  const billRec = data?.bill;
  const title = billRec ? displayTitle(billRec) : number;
  const statusText = billRec ? `${billRec.status} · ${billRec.date}` : "";
  const url = billRec?.url ?? `https://legiscan.com/gaits/search?state=${abbr}&keyword=${encodeURIComponent(number ?? "")}`;
  const provenance = ["Text from LegiScan", data?.textInfo?.textType, data?.textInfo?.textDate].filter(Boolean).join(" · ");
  const hint =
    active === null
      ? "Select a takeaway to see where the bill supports it. Highlighted passages are clickable."
      : "Click the takeaway again, or press Esc, to clear.";

  return (
    <div
      ref={rootRef}
      data-scroll-root="1"
      className="flex flex-col bg-[#FCFCFD] text-ink"
      style={embedded ? { height: "100%", minHeight: 0, overflowY: "auto" } : { minHeight: "100vh" }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-[5] flex h-[52px] flex-none items-center justify-between gap-3 border-b border-ink bg-[#FCFCFD] px-8 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
        <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-ink">{stateName}</span>
          <span>·</span>
          <span>{number}</span>
          {statusText && (
            <>
              <span>·</span>
              <span>{statusText}</span>
            </>
          )}
        </span>
        <div className="flex flex-none items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 whitespace-nowrap border border-hair px-2.5 py-[5px] text-mute no-underline hover:border-ink hover:text-ink"
          >
            <span>View on LegiScan</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" className="flex-none">
              <path d="M3.5 1H9v5.5" />
              <path d="M9 1L1 9" />
            </svg>
          </a>
          {embedded ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center border border-ink bg-transparent text-[16px] leading-none text-ink hover:bg-ink hover:text-white"
            >
              ×
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 whitespace-nowrap border border-ink px-2.5 py-[5px] text-ink no-underline hover:bg-ink hover:text-white"
            >
              <span>Back to map</span>
              <span className="text-[14px] leading-none">×</span>
            </Link>
          )}
        </div>
      </div>

      <div
        className="grid flex-none items-start"
        style={{ gridTemplateColumns: "clamp(260px,30vw,400px) minmax(0,1fr)", animation: "mapFadeUpA .4s ease both" }}
      >
        {/* Sidebar rail */}
        <div
          ref={railRef}
          data-rail="1"
          className="sticky top-[52px] overflow-x-hidden overflow-y-auto border-r border-hair bg-paper-2 pt-8 pb-10"
          style={{ height: "calc(100vh - 52px)" }}
        >
          <div className="mx-7 flex flex-col gap-3 border-b border-ink pb-[22px]">
            <span className="font-map-mono text-[10px] uppercase tracking-[0.1em] text-dim">In plain English</span>
            <p className="m-0 font-map-serif text-[21px] leading-[1.3] tracking-[-0.01em] text-pretty">
              {loading ? "Loading…" : billRec?.gist || (data ? billRec?.title : `No text on file for ${bill}.`)}
            </p>
          </div>

          {groups.map((g) => {
            const area = areaOf[g.k];
            const isOpen = !closedG[g.k];
            return (
              <div key={g.k} className="flex flex-col border-b border-hair pt-2.5">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setClosedG((s) => ({ ...s, [g.k]: !s[g.k] }))}
                  className="flex w-full cursor-pointer flex-col gap-2 overflow-hidden border-0 bg-transparent px-7 pt-3 pb-3.5 text-left text-ink"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 font-map-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink">
                      <span className="flex h-7 w-7 flex-none items-center justify-center bg-ink text-[12px] leading-none text-white">
                        {area?.icon ?? "§"}
                      </span>
                      {area?.label ?? g.k}
                      <InfoDot size={18} text={area?.desc ?? ""} show={tip.show} hide={tip.hide} />
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      <span className="whitespace-nowrap font-map-mono text-[10px] text-dim">{plural(g.items.length, "takeaway")}</span>
                      <span
                        className="flex h-[18px] w-[18px] items-center justify-center border border-hair-3 text-[11px] leading-none text-ink"
                        style={{ transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: `transform .3s ${EASE_STD}` }}
                      >
                        ▾
                      </span>
                    </span>
                  </span>
                  <span className="font-map-serif text-[17px] leading-[1.35] text-ink text-pretty">{g.summary}</span>
                </button>
                <div className="grid" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", transition: `grid-template-rows .35s ${EASE_STD}` }}>
                  <div className="flex min-h-0 flex-col overflow-hidden" style={{ opacity: isOpen ? 1 : 0, transition: "opacity .25s ease" }}>
                    {g.items.map(({ t, i }) => {
                      const isActive = activeT === i;
                      const citation = t.ids.length === 0 ? "" : t.ids.length === 1 ? cite(t.ids[0]!) : `${cite(t.ids[0]!)} +${t.ids.length - 1}`;
                      return (
                        <button
                          key={i}
                          id={"tk-" + (t.ids[0] ?? `n${t.orig}`)}
                          type="button"
                          onClick={() => activate(i)}
                          className={`ml-7 flex cursor-pointer flex-col items-stretch gap-1 border-0 border-l-2 py-3 pr-7 pl-4 text-left ${
                            isActive ? "border-l-ink bg-ink text-white" : "border-l-transparent bg-transparent text-ink hover:border-l-ink"
                          }`}
                          style={{
                            width: "calc(100% - 28px)",
                            boxShadow: "inset 1px 0 0 #D7DBE0",
                            transition: "background .15s ease, color .15s ease, border-color .2s ease",
                          }}
                        >
                          <span className="font-map-serif text-[17px] leading-[1.25] text-pretty">{t.title}</span>
                          <span
                            className="font-map-serif text-[14px] leading-[1.4] text-pretty"
                            style={{ color: isActive ? "rgba(255,255,255,.75)" : "#5F6770" }}
                          >
                            {t.text}
                          </span>
                          {citation && (
                            <span className="pt-0.5 font-map-mono text-[11px]" style={{ color: isActive ? "rgba(255,255,255,.6)" : "#9AA1A9" }}>
                              {citation}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="px-7 pt-4 font-map-mono text-[11px] leading-[1.5] text-dim">{hint}</div>
        </div>

        {/* Text column */}
        <div className="min-w-0">
          <div className="flex max-w-[820px] flex-col gap-[26px] pt-11 pb-[120px]" style={{ paddingLeft: "clamp(20px,4vw,56px)", paddingRight: "clamp(20px,4vw,56px)" }}>
            <h1 className="m-0 font-map-serif text-[36px] leading-[1.02] font-normal tracking-[-0.025em] text-balance">{title}</h1>
            <div className="border-t border-ink" />
            {text ? (
              <div className="flex flex-col">
                {lines.map((l) => {
                  const top = l.kind === "section" || l.kind === "act" || l.kind === "chapter";
                  const act = l.kind === "act";
                  const ch = l.kind === "chapter";
                  const prose = l.kind === "prose";
                  const hl = !!active && active.ids.includes(l.id);
                  const dimmed = dimOthers && !!active && !hl;
                  const cited = !!supp[l.id];
                  return (
                    <div
                      key={l.id}
                      id={"bt-" + l.id}
                      onClick={() => {
                        const hit = supp[l.id];
                        if (!hit) return;
                        setActiveT((cur) => (cur === hit[0] ? null : hit[0]!));
                      }}
                      className="grid items-baseline gap-x-4"
                      style={{
                        gridTemplateColumns: `${ch ? 108 : 72}px minmax(0,1fr)`,
                        padding: `${top ? 7 : 6}px 0 ${top ? 7 : 6}px ${l.kind === "sub" ? (l.depth - 1) * 26 : 0}px`,
                        marginTop: act || ch ? 28 : l.kind === "section" ? 22 : 0,
                        borderTop: act ? "1px solid #14181D" : 0,
                        background: hl ? HL_BG : "transparent",
                        boxShadow: hl ? "inset 2px 0 0 #14181D" : "none",
                        opacity: dimmed ? 0.38 : 1,
                        cursor: cited ? "pointer" : "default",
                        transition: "background .35s ease, box-shadow .35s ease, opacity .35s ease",
                      }}
                    >
                      <span
                        className="whitespace-nowrap text-right font-map-mono font-medium leading-[1.55]"
                        style={{ fontSize: top ? 14 : 12.5, color: top ? "#14181D" : l.depth >= 3 ? "#9AA1A9" : "#5F6770" }}
                      >
                        {l.label}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span
                          className="font-map-serif leading-[1.55] text-pretty"
                          style={{
                            fontSize: act || ch ? 13 : prose ? 18 : l.kind === "section" && l.text ? 18 : 17,
                            color: act || ch ? "#5F6770" : "#14181D",
                            fontWeight: ch ? 500 : 400,
                            fontStyle: prose ? "italic" : "normal",
                            letterSpacing: act || ch ? "0.06em" : 0,
                          }}
                        >
                          {l.text}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="m-0 font-map-mono text-[12px] text-dim">{loading ? "Loading…" : "No text on file for this bill."}</p>
            )}
            {counts && (
              <div className="flex justify-between gap-3 border-t border-hair pt-4 font-map-mono text-[11px] text-dim">
                <span>
                  {plural(counts.sectionCount, "section")} · {plural(counts.subdivisionCount, "subdivision")} · {counts.wordCount.toLocaleString()} words
                </span>
                <span>{provenance}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {tip.node}
    </div>
  );
}

/**
 * The embedded reader: a centred overlay over the map, kept mounted while
 * `billKey` is set so the exit animation can play. Portalled to <body> so its
 * fixed positioning is not captured by the transformed drawer.
 */
export function BillReaderOverlay({
  open,
  billKey,
  focus,
  onClose,
}: {
  open: boolean;
  billKey: string | null;
  focus: string | null;
  onClose: () => void;
}) {
  const mounted = useMounted();
  const { data, loading } = useBillDetail(billKey);
  if (!mounted || !billKey) return null;
  const on = open;
  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-20"
        style={{
          background: "rgba(20,24,29,.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          opacity: on ? 1 : 0,
          pointerEvents: on ? "auto" : "none",
          transition: "opacity .35s ease",
        }}
      />
      <div
        className="fixed top-0 bottom-0 left-1/2 z-[21] overflow-hidden border-x border-ink bg-[#FCFCFD]"
        style={{
          width: "min(1240px,100vw)",
          transform: `translateX(-50%) translateY(${on ? 0 : 24}px)`,
          opacity: on ? 1 : 0,
          pointerEvents: on ? "auto" : "none",
          transition: `opacity .35s ease, transform .45s ${EASE_OUT}`,
          boxShadow: "0 0 80px -20px rgba(20,24,29,.6)",
        }}
      >
        <BillReader bill={billKey} data={data} loading={loading} focus={focus} embedded onClose={onClose} />
      </div>
    </>,
    document.body,
  );
}
