import type { StateRecord } from "./types";

/**
 * Broadsheet map mode (handoff README, "Single-axis ramps" + "Broadsheet";
 * COLOR_SYSTEM_UPDATE.md for Combined). Every mode uses one 7-step ramp:
 * the single-axis modes index a sequential ramp by that axis alone, and
 * Combined indexes a diverging net-stance ramp built from the same two hues.
 */
export type MapMode = "combined" | "compute" | "reg";

export const MODES: { key: MapMode; label: string }[] = [
  { key: "combined", label: "Combined" },
  { key: "compute", label: "Compute" },
  { key: "reg", label: "Regulation" },
];

/** Index 0 = lowest value. Compute is indexed by posture + 3, Regulation by ai. */
export const RAMP_C = [
  "#F4E8D2",
  "#EBD7B4",
  "#E0C293",
  "#D3AB70",
  "#C29050",
  "#AB7538",
  "#8A5926",
] as const;
export const RAMP_R = [
  "#E4E6F1",
  "#D2D5E8",
  "#BABEDC",
  "#A0A4CC",
  "#848ABB",
  "#6A70A8",
  "#51578F",
] as const;

/**
 * Combined map fill, index 0 = most build-forward, 6 = most regulation-forward.
 * Amber and indigo are the ends of RAMP_C and RAMP_R, so the three modes read
 * as one family; the pale middle is where the two axes balance.
 */
export const RAMP_D = [
  "#8A5A22",
  "#B5813C",
  "#D8B87E",
  "#EDE9E2",
  "#A7ABCB",
  "#7A80AE",
  "#51578F",
] as const;
/** The readable variant of RAMP_D for text, dots and markers, same index. */
const NET_COLOR = [
  "#8A5A22",
  "#8A5A22",
  "#93743C",
  "#6C6F74",
  "#6A70A8",
  "#51578F",
  "#51578F",
] as const;

/** Axis accents: anything measuring build-out is amber, anything measuring regulation is indigo. */
export const AXIS = { build: "#AE7538", policy: "#6A70A8" } as const;
/** Segmented-bar fill for the inactive axis in a single-axis mode. */
export const DIM_BAR = "#B9BFC7";

/** Sequential ramps flip labels from white to ink once the fill is lighter than this index. */
const DARK_FROM = 4;

const clamp7 = (n: number) => Math.max(0, Math.min(6, n));

/** Net stance: 0 = build-out far ahead of regulation, 3 = balanced, 6 = regulation far ahead. */
export function netIdx(st: Pick<StateRecord, "posture" | "ai">): number {
  return clamp7(Math.round(3 + (st.ai - 3 - st.posture) / 2));
}

/** A state's colour "as a whole": its net stance at a contrast that survives small elements. */
export function netColor(st: Pick<StateRecord, "posture" | "ai">): string {
  return NET_COLOR[netIdx(st)]!;
}

/** Mix a hex colour toward the paper background by `t` (0 = unchanged, 1 = paper). */
export function tint(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, d: number) => Math.round(c + (d - c) * t);
  return (
    "#" +
    [mix(n >> 16, 247), mix((n >> 8) & 255, 248), mix(n & 255, 250)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** URL value → mode. Unknown or missing values fall back to Combined. */
export function parseMode(v: string | null | undefined): MapMode {
  if (v === "compute") return "compute";
  if (v === "reg" || v === "regulation") return "reg";
  return "combined";
}

/** Mode → URL value; Combined is the default and is omitted. */
export function modeParam(mode: MapMode): string | null {
  return mode === "combined" ? null : mode;
}

/** Position on the mode's ramp: Compute by posture + 3, Regulation by ai, Combined by net stance. */
export function rampIndex(
  mode: MapMode,
  st: Pick<StateRecord, "posture" | "ai">,
): number {
  if (mode === "compute") return clamp7(st.posture + 3);
  if (mode === "reg") return clamp7(st.ai);
  return netIdx(st);
}

export function rampFor(mode: MapMode): readonly string[] {
  return mode === "compute" ? RAMP_C : mode === "reg" ? RAMP_R : RAMP_D;
}

/** Map fill for a state under the given mode. */
export function fillFor(
  mode: MapMode,
  st: Pick<StateRecord, "posture" | "ai">,
): string {
  return rampFor(mode)[rampIndex(mode, st)]!;
}

/** Whether the fill is dark enough for a white label; the diverging ramp is dark at both ends. */
export function isDarkFill(
  mode: MapMode,
  st: Pick<StateRecord, "posture" | "ai">,
): boolean {
  const i = rampIndex(mode, st);
  return mode === "combined" ? i <= 1 || i >= 5 : i >= DARK_FROM;
}

/** One entry per ramp step: its color and how many states sit at that value. */
export function rampCounts(
  mode: MapMode,
  states: Pick<StateRecord, "posture" | "ai">[],
): { color: string; n: number }[] {
  return rampFor(mode).map((color, i) => ({
    color,
    n: states.filter((s) => rampIndex(mode, s) === i).length,
  }));
}

/** Accent for each dossier bar: its axis colour, or the dim grey when the other axis's mode is on. */
export function barAccents(mode: MapMode): { posture: string; ai: string } {
  return {
    posture: mode === "reg" ? DIM_BAR : AXIS.build,
    ai: mode === "compute" ? DIM_BAR : AXIS.policy,
  };
}

/** Which dossier accordion a mode opens; Combined leaves the current one alone. */
export function sectionForMode(mode: MapMode): "policy" | "ai" | null {
  return mode === "compute" ? "policy" : mode === "reg" ? "ai" : null;
}

/** Page H1 per mode, as segments so the italic emphasis survives the typewriter. */
export type TitleSegment = { text: string; em?: boolean };
const TITLE_LEAD = "Where each state stands on ";
export const MODE_TITLE: Record<MapMode, TitleSegment[]> = {
  combined: [
    { text: TITLE_LEAD },
    { text: "compute", em: true },
    { text: " and " },
    { text: "AI regulation", em: true },
  ],
  compute: [{ text: TITLE_LEAD }, { text: "compute", em: true }],
  reg: [{ text: TITLE_LEAD }, { text: "regulation", em: true }],
};

/**
 * Lay a partially typed title back over its segments. While erasing, the
 * text is still a prefix of the previous mode's title, so the segments are
 * chosen by prefix match rather than taken from the current mode.
 */
export function typedSegments(mode: MapMode, typed: string): TitleSegment[] {
  const segments =
    Object.values(MODE_TITLE).find((segs) =>
      segs
        .map((t) => t.text)
        .join("")
        .startsWith(typed),
    ) ?? MODE_TITLE[mode];
  let i = 0;
  const out: TitleSegment[] = [];
  for (const seg of segments) {
    const text = typed.slice(i, i + seg.text.length);
    i += seg.text.length;
    if (text) out.push({ ...seg, text });
  }
  return out;
}

const COMPARE_HINT =
  "Click a state to open its dossier; use Compare to pin a second state.";

export const MODE_COPY: Record<
  MapMode,
  { caption: string; axisTitle: string; axisLow: string; axisHigh: string }
> = {
  combined: {
    caption: `Color is one net-stance score: amber where build-out outpaces regulation, indigo where regulation outpaces build-out, neutral where they balance. ${COMPARE_HINT}`,
    axisTitle: "Net stance",
    axisLow: "Build-forward",
    axisHigh: "Regulation-forward",
  },
  compute: {
    caption: `Color is data center posture alone, from −3 (restricting) to +3 (accelerating). ${COMPARE_HINT}`,
    axisTitle: "Data center posture",
    axisLow: "Restrict (−3)",
    axisHigh: "Accelerate (+3)",
  },
  reg: {
    caption: `Color is AI regulation strength alone, from 0 (nothing enacted) to 6 (comprehensive). ${COMPARE_HINT}`,
    axisTitle: "AI regulation strength",
    axisLow: "None (0)",
    axisHigh: "Comprehensive (6)",
  },
};
