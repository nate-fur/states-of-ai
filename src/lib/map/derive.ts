import { TIERS, TOPICS } from "./data";
import type {
  BillStatus,
  DetailSelection,
  MapBill,
  Quadrant,
  QuadrantKey,
  StateRecord,
  Topic,
} from "./types";

export const STATUS_ORDER: Record<BillStatus, number> = {
  enacted: 0,
  pending: 1,
  proposed: 2,
};

export function quadrant(posture: number, ai: number): Quadrant {
  const build = posture >= 0;
  const strong = ai >= 3;
  if (!build && strong) return { key: "brakes", label: "Full brakes", color: "#5C62A8" };
  if (build && strong) return { key: "regulate", label: "Build & regulate", color: "#4A8C82" };
  if (build && !strong) return { key: "throttle", label: "Full throttle", color: "#D4A15E" };
  return { key: "slow", label: "Slow lane", color: "#B0776A" };
}

export function grade(
  st: StateRecord,
  k: string,
): { tier: number; note: string } {
  const g = st.grades?.[k];
  if (g) return { tier: g[0], note: g[1] };
  const n = st.bills.filter((b) => b.tags.includes(k) && b.s === "enacted").length;
  return { tier: Math.min(3, n), note: "" };
}

export function hasPending(st: StateRecord, k: string): boolean {
  return st.bills.some((b) => b.tags.includes(k) && b.s !== "enacted");
}

export function peers(st: StateRecord, k: string, all: StateRecord[]): number {
  const t = grade(st, k).tier;
  return all.filter((s) => grade(s, k).tier >= t).length;
}

export function bucketStatus(st: StateRecord, k: string): number {
  return st.bills
    .filter((b) => b.tags.includes(k))
    .reduce((m, b) => Math.min(m, STATUS_ORDER[b.s]), 3);
}

export function gw(mw: number): string {
  return mw >= 1000
    ? `${(mw / 1000).toFixed(1)} GW`
    : `${Math.round(mw).toLocaleString()} MW`;
}

export function growthPct(st: StateRecord): number {
  const g = st.growth;
  if (!g[0]) return 0;
  return Math.round(((g[5]! - g[0]!) / g[0]!) * 100);
}

export function sign(n: number): string {
  return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
}

export function postureCells(st: StateRecord): string[] {
  const dim = "#D7DBE0";
  const qc = st.q.color;
  return [-3, -2, -1, 0, 1, 2, 3].map((v) =>
    v === 0
      ? "#14181D"
      : (st.posture < 0 && v < 0 && v >= st.posture) ||
          (st.posture > 0 && v > 0 && v <= st.posture)
        ? qc
        : dim,
  );
}

export function aiCells(st: StateRecord): string[] {
  const dim = "#D7DBE0";
  return [1, 2, 3, 4, 5, 6].map((v) => (v <= st.ai ? st.q.color : dim));
}

export function scaleDots(
  tier: number,
  pending: boolean,
  inverted = false,
): { filled: boolean; hollow: boolean; on: string; off: string }[] {
  const on = inverted ? "#fff" : "#14181D";
  const off = inverted ? "rgba(255,255,255,.3)" : "#D7DBE0";
  return [1, 2, 3, 4].map((v) => ({
    filled: v <= tier,
    hollow: pending && v === tier + 1,
    on,
    off,
  }));
}

export function topicLabelMap(topics: Topic[] = TOPICS): Record<string, string> {
  return Object.fromEntries(topics.map((t) => [t.k, t.label]));
}

export function sortedBills(bills: MapBill[]): MapBill[] {
  return [...bills].sort((a, b) => STATUS_ORDER[a.s] - STATUS_ORDER[b.s]);
}

export function statusColor(s: BillStatus, qc: string): string {
  if (s === "enacted") return "#14181D";
  if (s === "pending") return qc;
  return "#9AA1A9";
}

export function statusLine(status: number, qc: string): {
  text: string;
  color: string;
} {
  const texts = [
    "Enacted law",
    "Pending legislation",
    "Proposed only",
    "No activity tracked",
  ];
  return {
    text: texts[status] ?? texts[3]!,
    color: status === 0 ? "#14181D" : status === 1 ? qc : "#9AA1A9",
  };
}

export function glyphForStatus(status: number): {
  bg: string;
  border: string;
  icon: string;
} {
  return status === 0
    ? { bg: "#14181D", border: "#14181D", icon: "#fff" }
    : { bg: "transparent", border: "#5F6770", icon: "#5F6770" };
}

export function interactiveGlyph(
  status: number,
  qc: string,
  inverted: boolean,
): { bg: string; border: string; icon: string; text: string } {
  if (inverted) {
    return { bg: "transparent", border: "#fff", icon: "#fff", text: "#fff" };
  }
  return {
    bg: status === 0 ? "#14181D" : "transparent",
    border: status === 0 ? "#14181D" : status === 1 ? qc : "#D7DBE0",
    icon: status === 0 ? "#fff" : status === 1 ? qc : "#C4C9CF",
    text: status <= 1 ? "#14181D" : "#9AA1A9",
  };
}

export function donutSegments(st: StateRecord): {
  n: string;
  v: number;
  color: string;
  dash: string;
  offset: number;
}[] {
  const qc = st.q.color;
  const shades = ["#14181D", qc, "#9AA1A9", "#D7DBE0"];
  const C = 2 * Math.PI * 15.5;
  let acc = 0;
  const segs = [
    ...st.ops.map((o, i) => ({
      n: o.n,
      v: o.v,
      color: shades[i] ?? "#9AA1A9",
    })),
    {
      n: "Other",
      v: Math.max(0, 100 - st.ops.reduce((a, o) => a + o.v, 0)),
      color: "#D7DBE0",
    },
  ];
  return segs.map((s) => {
    const d = {
      ...s,
      dash: `${(s.v / 100) * C} ${C}`,
      offset: -acc,
    };
    acc += (s.v / 100) * C;
    return d;
  });
}

export function capacityStats(all: StateRecord[]): { maxMw: number; median: number } {
  const sorted = all.map((s) => s.mw).sort((a, b) => a - b);
  return {
    maxMw: sorted[sorted.length - 1] || 1,
    median: sorted[Math.floor(sorted.length / 2)] || 0,
  };
}

export function billPool(all: StateRecord[], status: BillStatus): number {
  return all.reduce(
    (m, s) => Math.max(m, s.bills.filter((b) => b.s === status).length),
    0,
  );
}

export function legiscanUrl(abbr: string, keyword: string): string {
  return `https://legiscan.com/gaits/search?state=${abbr}&keyword=${encodeURIComponent(keyword)}`;
}

export function countQuadrants(
  states: StateRecord[],
): Record<QuadrantKey, number> {
  const out: Record<QuadrantKey, number> = {
    brakes: 0,
    regulate: 0,
    slow: 0,
    throttle: 0,
  };
  for (const s of states) out[s.q.key] += 1;
  return out;
}

export function buildDetail(
  detail: DetailSelection | null,
  st: StateRecord | undefined,
  all: StateRecord[],
  topics: Topic[] = TOPICS,
) {
  if (!detail || !st) return null;
  const qc = st.q.color;
  if ("bill" in detail && detail.bill) {
    const bill = st.bills.find((b) => b.n === detail.bill);
    if (!bill) return null;
    const buckets = topics
      .filter((t) => bill.tags.includes(t.k))
      .map((t) => {
        const status = bucketStatus(st, t.k);
        const g = glyphForStatus(status);
        return {
          k: t.k,
          label: t.label,
          glyph: t.icon,
          desc: t.desc,
          status,
          bg: g.bg,
          border: g.border,
          iconColor: g.icon,
        };
      });
    const g = glyphForStatus(bill.s === "enacted" ? 0 : 3);
    return {
      kind: "bill" as const,
      stateName: st.name,
      abbr: st.abbr,
      label: bill.n,
      glyph: "§",
      bg: g.bg,
      border: g.border,
      iconColor: g.icon,
      statusText: `${bill.s.charAt(0).toUpperCase()}${bill.s.slice(1)} · ${bill.d}`,
      statusColor: statusColor(bill.s, qc),
      title: bill.t,
      buckets,
      // Live bills carry their own LegiScan page; the seed falls back to a search.
      legiscanUrl: bill.url ?? legiscanUrl(st.abbr, bill.n),
      legiscanLabel: bill.url ? "View on LegiScan" : "LegiScan search",
    };
  }
  if ("k" in detail && detail.k) {
    const topic = topics.find((t) => t.k === detail.k);
    if (!topic) return null;
    const status = bucketStatus(st, topic.k);
    const g = grade(st, topic.k);
    const glyph = glyphForStatus(status);
    const bills = st.bills
      .filter((b) => b.tags.includes(topic.k))
      .map((b) => ({
        ...b,
        color: statusColor(b.s, qc),
        url: b.url ?? legiscanUrl(st.abbr, b.n),
      }));
    const line = statusLine(status, qc);
    return {
      kind: "topic" as const,
      stateName: st.name,
      abbr: st.abbr,
      label: topic.label,
      glyph: topic.icon,
      bg: glyph.bg,
      border: glyph.border,
      iconColor: glyph.icon,
      desc: topic.desc,
      statusText: line.text,
      statusColor: line.color,
      bills,
      tierName: TIERS[g.tier] ?? "None",
      tierNum: String(g.tier),
      peersText: `${peers(st, topic.k, all)} of ${all.length} states`,
      legiscanUrl: legiscanUrl(st.abbr, topic.label),
      legiscanLabel: "LegiScan search",
    };
  }
  return null;
}

export { TIERS, TOPICS };
