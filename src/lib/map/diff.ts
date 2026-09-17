import { TOPICS } from "./data";
import {
  STATUS_ORDER,
  aiCells,
  grade,
  growthPct,
  gw,
  hasPending,
  postureCells,
  scaleDots,
  sign,
  statusColor,
  topicLabelMap,
} from "./derive";
import type { StateRecord } from "./types";

export type DiffMetricRow = {
  label: string;
  sub: string;
  a: string;
  b: string;
  aSub: string;
  bSub: string;
  size: string;
  delta: string;
  deltaColor: string;
  deltaSub: string;
  same: boolean;
  hasBars?: boolean;
  aCells?: string[];
  bCells?: string[];
};

export type DiffGovRow = {
  label: string;
  glyph: string;
  same: boolean;
  neither: boolean;
  gap: number;
  aTier: number;
  bTier: number;
  aName: string;
  bName: string;
  aPending: boolean;
  bPending: boolean;
  delta: string;
  deltaSub: string;
  deltaColor: string;
  leadColor: string;
  rubricA: string;
  rubricB: string;
};

export type DiffBillRow = {
  n: string;
  t: string;
  d: string;
  s: string;
  stateName: string;
  tagText: string;
  markBg: string;
  markBorder: string;
  statusColor: string;
};

function lead(
  va: number,
  vb: number,
  aAbbr: string,
  bAbbr: string,
  fmt: (d: number) => string,
) {
  if (va === vb) return { delta: "same", deltaColor: "#9AA1A9" };
  return {
    delta: `${va > vb ? aAbbr : bAbbr} ${fmt(Math.abs(va - vb))}`,
    deltaColor: "#14181D",
  };
}

export function buildDiff(a: StateRecord, b: StateRecord) {
  const ga = growthPct(a);
  const gb = growthPct(b);
  const ratio =
    a.mw && b.mw ? Math.max(a.mw, b.mw) / Math.min(a.mw, b.mw) : 0;

  const metrics: DiffMetricRow[] = [
    {
      label: "Data center posture",
      sub: "−3 restrict · +3 accelerate",
      a: sign(a.posture),
      b: sign(b.posture),
      hasBars: true,
      aCells: postureCells(a),
      bCells: postureCells(b),
      aSub: a.q.label,
      bSub: b.q.label,
      size: "20px",
      ...lead(a.posture, b.posture, a.abbr, b.abbr, (d) => `+${d} toward accel`),
      deltaSub: "",
      same: a.posture === b.posture,
    },
    {
      label: "AI regulation",
      sub: "0 weak · 6 strong",
      a: `${a.ai}/6`,
      b: `${b.ai}/6`,
      hasBars: true,
      aCells: aiCells(a),
      bCells: aiCells(b),
      aSub: "",
      bSub: "",
      size: "20px",
      ...lead(a.ai, b.ai, a.abbr, b.abbr, (d) => `+${d} stronger`),
      deltaSub: "",
      same: a.ai === b.ai,
    },
    {
      label: "Installed capacity",
      sub: "operating data centers",
      a: gw(a.mw),
      b: gw(b.mw),
      aSub: `+${ga}% since 2021`,
      bSub: `+${gb}% since 2021`,
      size: "20px",
      ...lead(a.mw, b.mw, a.abbr, b.abbr, () => `×${ratio.toFixed(1)}`),
      deltaSub: `${gw(Math.abs(a.mw - b.mw))} gap`,
      same: a.mw === b.mw,
    },
    {
      label: "Growth since 2021",
      sub: "capacity change",
      a: `+${ga}%`,
      b: `+${gb}%`,
      aSub: "",
      bSub: "",
      size: "20px",
      ...lead(ga, gb, a.abbr, b.abbr, (d) => `+${d} pts`),
      deltaSub: "",
      same: ga === gb,
    },
    {
      label: "Sites",
      sub: "tracked facilities",
      a: String(a.count),
      b: String(b.count),
      aSub: `incentives ${a.incentives ? "active" : "none"}`,
      bSub: `incentives ${b.incentives ? "active" : "none"}`,
      size: "20px",
      ...lead(a.count, b.count, a.abbr, b.abbr, (d) => `+${d} sites`),
      deltaSub: a.incentives === b.incentives ? "" : "incentives differ",
      same: a.count === b.count && a.incentives === b.incentives,
    },
    {
      label: "Local pushback",
      sub: "city or county actions",
      a: String(a.local.length),
      b: String(b.local.length),
      aSub: a.local[0]?.p ?? "",
      bSub: b.local[0]?.p ?? "",
      size: "20px",
      ...lead(a.local.length, b.local.length, a.abbr, b.abbr, (d) => `+${d} actions`),
      deltaSub: "",
      same: a.local.length === b.local.length,
    },
    {
      label: "Moratorium",
      sub: "statewide pause on new builds",
      a: a.moratorium,
      b: b.moratorium,
      aSub: "",
      bSub: "",
      size: "14px",
      delta: a.moratorium === b.moratorium ? "same" : "differs",
      deltaColor: a.moratorium === b.moratorium ? "#9AA1A9" : "#14181D",
      deltaSub: "",
      same: a.moratorium === b.moratorium,
    },
    {
      label: "Federal preemption",
      sub: "flagged under the executive order",
      a: a.preempt ? "Flagged" : "—",
      b: b.preempt ? "Flagged" : "—",
      aSub: "",
      bSub: "",
      size: "14px",
      delta: a.preempt === b.preempt ? "same" : "differs",
      deltaColor: a.preempt === b.preempt ? "#9AA1A9" : "#14181D",
      deltaSub: "",
      same: a.preempt === b.preempt,
    },
  ];

  const TIERS = ["None", "Light", "Moderate", "Strong", "Comprehensive"];
  let onlyA = 0;
  let both = 0;
  let onlyB = 0;
  let neither = 0;

  const gov: DiffGovRow[] = TOPICS.map((t) => {
    const ta = grade(a, t.k).tier;
    const tb = grade(b, t.k).tier;
    const ha = ta > 0;
    const hb = tb > 0;
    if (ha && hb) both += 1;
    else if (ha) onlyA += 1;
    else if (hb) onlyB += 1;
    else neither += 1;
    const same = ta === tb;
    const gap = Math.abs(ta - tb);
    const leader = ta > tb ? a : b;
    const any = ha || hb;
    const delta = same ? (any ? "same" : "neither") : `${leader.abbr} stricter`;
    const deltaSub = same
      ? any
        ? `both ${TIERS[ta]!.toLowerCase()}`
        : "no enacted law"
      : `+${gap} ${gap === 1 ? "tier" : "tiers"}`;
    return {
      label: t.label,
      glyph: t.icon,
      same,
      neither: !any,
      gap,
      aTier: ta,
      bTier: tb,
      aName: TIERS[ta]!,
      bName: TIERS[tb]!,
      aPending: hasPending(a, t.k) && ta < 4,
      bPending: hasPending(b, t.k) && tb < 4,
      delta,
      deltaSub,
      deltaColor: same ? "#9AA1A9" : "#14181D",
      leadColor: same ? "#D7DBE0" : leader.q.color,
      rubricA: t.rubric[ta] ?? "",
      rubricB: t.rubric[tb] ?? "",
    };
  }).sort((x, y) => y.gap - x.gap || (y.neither ? 0 : 1) - (x.neither ? 0 : 1));

  const tl = topicLabelMap();
  const MON = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const ts = (d: string) => {
    const y = Number((String(d).match(/\d{4}/) || [0])[0]);
    const m = MON.findIndex((mm) => String(d).toLowerCase().includes(mm));
    return y * 12 + (m < 0 ? 0 : m + 1);
  };
  const mk = (s: StateRecord, isA: boolean): (DiffBillRow & { _t: number })[] =>
    s.bills.map((x) => ({
      n: x.n,
      t: x.t,
      d: x.d,
      s: x.s,
      stateName: s.name,
      tagText: x.tags.map((k) => tl[k] || k).join(", "),
      markBg: isA ? s.q.color : "#F7F8FA",
      markBorder: s.q.color,
      statusColor: statusColor(x.s, s.q.color),
      _t: ts(x.d),
    }));

  const bills = [...mk(a, true), ...mk(b, false)].sort(
    (x, y) =>
      y._t - x._t ||
      STATUS_ORDER[x.s as keyof typeof STATUS_ORDER] -
        STATUS_ORDER[y.s as keyof typeof STATUS_ORDER],
  );

  const parts: string[] = [];
  if (a.posture !== b.posture) {
    parts.push(
      `${a.posture > b.posture ? a.name : b.name} leans further toward accelerating data centers (${sign(a.posture)} vs ${sign(b.posture)})`,
    );
  } else {
    parts.push(`Both sit at ${sign(a.posture)} on data center posture`);
  }
  if (a.ai !== b.ai) {
    parts.push(
      `${a.ai > b.ai ? a.name : b.name} regulates AI more strictly (${a.ai}/6 vs ${b.ai}/6)`,
    );
  } else {
    parts.push(`they match on AI regulation (${a.ai}/6)`);
  }
  if (ratio >= 1.15) {
    parts.push(
      `${a.mw > b.mw ? a.name : b.name} hosts ${ratio.toFixed(1)}× the installed capacity`,
    );
  }
  const headline =
    parts[0] +
    (parts.length > 2 ? `, ${parts[1]}, and ${parts[2]}` : ` and ${parts[1]}`) +
    ".";

  const diffCount =
    metrics.filter((r) => !r.same).length + gov.filter((r) => !r.same).length;
  const sameCount = metrics.length + gov.length - diffCount;

  const metricLeadsA = metrics.filter((r) => r.delta.startsWith(`${a.abbr} `)).length;
  const metricLeadsB = metrics.filter((r) => r.delta.startsWith(`${b.abbr} `)).length;
  const metricSame = metrics.filter((r) => r.same).length;
  const govA = gov.filter((r) => !r.same && r.delta.startsWith(a.abbr)).length;
  const govB = gov.filter((r) => !r.same && r.delta.startsWith(b.abbr)).length;
  const govSame = gov.filter((r) => r.same).length;
  const enacted = bills.filter((x) => x.s === "enacted").length;
  const pending = bills.filter((x) => x.s === "pending").length;

  return {
    A: {
      name: a.name,
      abbr: a.abbr,
      color: a.q.color,
      dotX: `${(10 + ((a.posture + 3) / 6) * 80).toFixed(0)}%`,
      dotY: `${(90 - (a.ai / 6) * 80).toFixed(0)}%`,
    },
    B: {
      name: b.name,
      abbr: b.abbr,
      color: b.q.color,
      dotX: `${(10 + ((b.posture + 3) / 6) * 80).toFixed(0)}%`,
      dotY: `${(90 - (b.ai / 6) * 80).toFixed(0)}%`,
    },
    metrics,
    gov,
    bills: bills.map(({ _t, ...rest }) => rest),
    headline,
    diffCount,
    sameCount,
    metricsNote: `${a.abbr} leads ${metricLeadsA} · ${b.abbr} leads ${metricLeadsB}${metricSame ? ` · ${metricSame} same` : ""}`,
    govNote: `${a.abbr} stricter in ${govA} · ${b.abbr} in ${govB} · ${govSame} same`,
    billsNote: `${bills.length} bills · ${enacted} enacted · ${pending} pending`,
    onlyA,
    both,
    onlyB,
    neither,
  };
}

export { scaleDots };
