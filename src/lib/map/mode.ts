import type { StateRecord } from "./types";

/**
 * Broadsheet map mode (handoff README, "Single-axis ramps" + "Broadsheet").
 * Combined colors each state by quadrant; the single-axis modes use one
 * sequential 7-step ramp indexed by that axis alone. Nothing outside the
 * Broadsheet (map fill, legend, dossier bar accents) reads these.
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

/** Segmented-bar fill for the active axis inside the dossier, replacing `qc`. */
export const MODE_ACCENT: Record<Exclude<MapMode, "combined">, string> = {
  compute: "#AB7538",
  reg: "#6A70A8",
};
/** Segmented-bar fill for the inactive axis in a single-axis mode. */
export const DIM_BAR = "#B9BFC7";

/** Labels flip from white to ink once the fill is lighter than this index. */
const DARK_FROM = 4;

const clamp7 = (n: number) => Math.max(0, Math.min(6, n));

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

/** Position on the active ramp, or null in Combined mode. */
export function rampIndex(mode: MapMode, st: Pick<StateRecord, "posture" | "ai">): number | null {
  if (mode === "compute") return clamp7(st.posture + 3);
  if (mode === "reg") return clamp7(st.ai);
  return null;
}

export function rampFor(mode: MapMode): readonly string[] {
  return mode === "compute" ? RAMP_C : mode === "reg" ? RAMP_R : [];
}

/** Map fill for a state under the given mode. */
export function fillFor(mode: MapMode, st: Pick<StateRecord, "posture" | "ai" | "q">): string {
  const i = rampIndex(mode, st);
  return i === null ? st.q.color : rampFor(mode)[i]!;
}

/** Whether the fill is dark enough for a white label. Quadrant colors always are. */
export function isDarkFill(mode: MapMode, st: Pick<StateRecord, "posture" | "ai">): boolean {
  const i = rampIndex(mode, st);
  return i === null || i >= DARK_FROM;
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

/** Accent for each dossier bar: `qc` in Combined, else the mode tone or the dim grey. */
export function barAccents(mode: MapMode, qc: string): { posture: string; ai: string } {
  if (mode === "compute") return { posture: MODE_ACCENT.compute, ai: DIM_BAR };
  if (mode === "reg") return { posture: DIM_BAR, ai: MODE_ACCENT.reg };
  return { posture: qc, ai: qc };
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
    { text: "regulation", em: true },
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
      segs.map((t) => t.text).join("").startsWith(typed),
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

const COMPARE_HINT = "Click a state to open its dossier; use Compare to pin a second state.";

export const MODE_COPY: Record<
  MapMode,
  { caption: string; axisTitle: string; axisLow: string; axisHigh: string }
> = {
  combined: {
    caption: `Color is the state's quadrant: data center posture (−3 restricting to +3 accelerating) against AI regulation strength (0–6). ${COMPARE_HINT}`,
    axisTitle: "",
    axisLow: "",
    axisHigh: "",
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
