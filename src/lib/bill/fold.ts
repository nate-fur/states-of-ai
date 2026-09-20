// Folded text for a selected takeaway (handoff 3). Pure derivation from the
// parsed lines and the takeaway's cited line positions: which neighbourhoods
// stay visible, which stretches collapse into a fold bar, and what the bar's
// endpoints are called. Nothing here is stored; the reader recomputes it on
// (lines, active takeaway, opened folds).

import type { BillLine } from "./parse";

/** A gap of more than this many lines between cited lines starts a new cluster. */
export const CLUSTER_GAP = 6;
/** Runs shorter than this render as lines; a bar would cost more height than it hides. */
export const MIN_FOLD = 3;

// Each cluster window gets one line of context on both sides…
const CONTEXT = 1;
// …and reaches up to its enclosing section/act heading if it is this close.
const HEADING_REACH = 14;
// Windows this close together merge into one.
const MERGE_GAP = 3;

/** Group sorted line indexes into clusters. */
export function clusters(idxs: number[], gap: number = CLUSTER_GAP): number[][] {
  const out: number[][] = [];
  for (const i of [...idxs].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && i - last[last.length - 1]! <= gap) last.push(i);
    else out.push([i]);
  }
  return out;
}

/**
 * Structural labels for a line: a backward walk that stops at the first act
 * section, because an act section is a hard scope boundary. Chapter and
 * codified-section headings found before it belong to it; anything past it
 * does not (Sec. 9 must not borrow § 2056 from Sec. 8).
 */
export function pathAt(lines: BillLine[], i: number): { full: string; short: string } {
  let act = "";
  let ch = "";
  let sec = "";
  for (let j = i; j >= 0; j--) {
    const l = lines[j]!;
    if (l.kind === "act") {
      act = l.label;
      break;
    }
    if (!sec && l.kind === "section") sec = l.label;
    if (!ch && l.kind === "chapter") ch = l.label;
  }
  return { full: [act, ch, sec].filter(Boolean).join("  ·  "), short: sec || ch || act || "the bill" };
}

export type Chunk =
  | { key: string; kind: "lines"; from: number; to: number }
  | { key: string; kind: "fold"; from: number; to: number; count: number; label: string };

/**
 * The text column for an active takeaway: an inclusive `[from, to]` range per
 * visible window, and a fold for each stretch between them that is at least
 * MIN_FOLD lines and not in `opened`. With no cited lines the whole bill
 * renders as one window.
 */
export function foldPlan(lines: BillLine[], idxs: number[], opened: Record<string, boolean>): Chunk[] {
  const n = lines.length;
  if (n === 0) return [];
  if (idxs.length === 0) return [{ key: "all", kind: "lines", from: 0, to: n - 1 }];

  // A window per cluster, extended up to its enclosing heading.
  const wins = clusters(idxs).map((c) => {
    const first = c[0]!;
    let s = Math.max(0, first - CONTEXT);
    for (let j = first; j >= 0 && first - j < HEADING_REACH; j--) {
      const kind = lines[j]!.kind;
      if (kind === "section" || kind === "act") {
        s = Math.min(s, j);
        break;
      }
    }
    return [s, Math.min(n - 1, c[c.length - 1]! + CONTEXT)] as [number, number];
  });
  const merged: [number, number][] = [];
  for (const w of wins) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1] + MERGE_GAP) last[1] = Math.max(last[1], w[1]);
    else merged.push([w[0], w[1]]);
  }

  const chunks: Chunk[] = [];
  const gap = (from: number, to: number, toLabel: string) => {
    const key = `g${from}-${to}`;
    const count = to - from + 1;
    if (count < MIN_FOLD || opened[key]) chunks.push({ key, kind: "lines", from, to });
    else {
      const fromLabel = from === 0 ? "the start of the bill" : pathAt(lines, from).short;
      chunks.push({ key, kind: "fold", from, to, count, label: `${count} lines folded  ·  ${fromLabel} → ${toLabel}` });
    }
  };
  let cursor = 0;
  merged.forEach((w, wi) => {
    if (w[0] > cursor) gap(cursor, w[0] - 1, pathAt(lines, w[0] - 1).short);
    chunks.push({ key: `w${wi}`, kind: "lines", from: w[0], to: w[1] });
    cursor = w[1] + 1;
  });
  if (cursor < n) gap(cursor, n - 1, "end of bill");
  return chunks;
}
