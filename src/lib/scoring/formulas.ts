// The scoring formulas. Pure functions with no Convex or React imports so
// the pipeline (convex/scores.ts), the /scoring page, and scripts all run
// the same code. docs/scoring.md explains the method in prose; the numbers
// there are these constants.

// Extension so node can run scripts/check-scoring.mts against this file directly.
import { AREA_KEYS, CHECKLISTS } from "./checklists.ts";

export const TIER_NAMES = ["None", "Light", "Moderate", "Strong", "Comprehensive"] as const;

// ---------------------------------------------------------------------------
// Area tier (0 to 4) from checked elements
// ---------------------------------------------------------------------------

export type TierBreakdown = {
  tier: 0 | 1 | 2 | 3 | 4;
  /** Element ids that were both claimed and exist in the checklist. */
  met: string[];
  /** Highest level among the met elements; 0 when none. */
  maxLevel: number;
};

/**
 * Tier rule: a tier of N needs at least N provisions on the books, one of
 * which sits at level N. So a single level-4 provision earns tier 1, and a
 * state reaches Comprehensive only with four or more provisions including a
 * level-4 one. Unknown ids are ignored.
 */
export function tierFromElements(area: string, elementIds: Iterable<string>): TierBreakdown {
  const checklist = CHECKLISTS[area];
  if (!checklist) return { tier: 0, met: [], maxLevel: 0 };
  const known = new Map(checklist.elements.map((e) => [e.id, e.level]));
  const met = [...new Set(elementIds)].filter((id) => known.has(id));
  const maxLevel = met.reduce((m, id) => Math.max(m, known.get(id)!), 0);
  const tier = Math.min(maxLevel, met.length, 4) as TierBreakdown["tier"];
  return { tier, met, maxLevel };
}

// ---------------------------------------------------------------------------
// AI regulation score (0 to 6) from area tiers
// ---------------------------------------------------------------------------

export type Band = { min: number; name: string; blurb: string };

/** Points are the plain sum of the nine area tiers, 0 to 36. */
export const REGULATION_MAX_POINTS = AREA_KEYS.length * 4;

/**
 * Bands are fixed cut points on the point total, chosen so the range is
 * used: one enacted provision anywhere lifts a state off 0, and a state
 * averaging Strong across the areas reaches 6. index = score.
 */
export const REGULATION_BANDS: Band[] = [
  { min: 0, name: "None", blurb: "Nothing enacted in any area." },
  { min: 1, name: "Minimal", blurb: "A first law or two, usually deepfakes or a disclosure duty." },
  { min: 4, name: "Emerging", blurb: "Several narrow laws, or one area regulated in depth." },
  { min: 8, name: "Developing", blurb: "Rules in several areas with at least one Strong or Comprehensive regime." },
  { min: 13, name: "Established", blurb: "Most areas covered, with binding duties and enforcement in some." },
  { min: 19, name: "Extensive", blurb: "Binding duties across most areas; several Strong or Comprehensive." },
  { min: 26, name: "Comprehensive", blurb: "Strong or better across most of the map of AI policy." },
];

export function regulationPoints(tiers: Record<string, number | undefined>): number {
  return AREA_KEYS.reduce((sum, key) => sum + clampTier(tiers[key] ?? 0), 0);
}

export function regulationScore(points: number): number {
  let score = 0;
  for (let i = 0; i < REGULATION_BANDS.length; i++) if (points >= REGULATION_BANDS[i]!.min) score = i;
  return score;
}

export function regulationBand(score: number): Band {
  return REGULATION_BANDS[Math.max(0, Math.min(6, Math.round(score)))]!;
}

function clampTier(t: number): number {
  return Math.max(0, Math.min(4, Math.round(t)));
}

// ---------------------------------------------------------------------------
// Data center build-out (-3 to +3) from facilities
// ---------------------------------------------------------------------------

export type FacilityLike = {
  status: "operational" | "under_construction" | "proposed";
  capacityMw: number | null;
};

/**
 * Compute Atlas leaves capacity undisclosed for most sites. Rather than count
 * those as zero, each undisclosed site is imputed at a deliberately low
 * figure: the median disclosed operating site is 10 MW; pipeline sites are
 * imputed well below their medians (300 to 360 MW) because announcements run
 * large.
 */
export const IMPUTED_MW = { operational: 10, under_construction: 100, proposed: 100 } as const;

/** Pipeline megawatts count at a discount: half for steel in the ground, a fifth for announcements. */
export const PIPELINE_WEIGHTS = { under_construction: 0.5, proposed: 0.2 } as const;

/** Operating MW (imputed) at or above each cut moves the base one step up from -3. */
export const BASE_CUTS = [25, 100, 250, 600, 1000] as const; // -> -3 … +2

/** Weighted pipeline MW at or above each cut adds one step. */
export const MOMENTUM_CUTS = [500, 5000] as const; // -> +0 … +2

/** index = score + 3. */
export const BUILD_OUT_BANDS: Band[] = [
  { min: -3, name: "Negligible", blurb: "Under 25 MW operating and no meaningful pipeline." },
  { min: -2, name: "Minimal", blurb: "A handful of small sites." },
  { min: -1, name: "Emerging", blurb: "A regional footprint, or a small base with projects underway." },
  { min: 0, name: "Established", blurb: "Hundreds of megawatts operating, or a modest base with a large pipeline." },
  { min: 1, name: "Major", blurb: "A large operating base with more on the way." },
  { min: 2, name: "Leading", blurb: "Among the largest operating bases, or a very large pipeline." },
  { min: 3, name: "Hyperscale", blurb: "A gigawatt-class base and a gigawatt-class pipeline." },
];

export type CapacitySummary = {
  sites: Record<FacilityLike["status"], number>;
  undisclosed: Record<FacilityLike["status"], number>;
  reportedMw: Record<FacilityLike["status"], number>;
  /** Reported plus imputed, per status. */
  estimatedMw: Record<FacilityLike["status"], number>;
  operatingMw: number;
  pipelineMw: number; // weighted
};

export function summarizeCapacity(facilities: FacilityLike[]): CapacitySummary {
  const zero = () => ({ operational: 0, under_construction: 0, proposed: 0 });
  const sites = zero();
  const undisclosed = zero();
  const reportedMw = zero();
  const estimatedMw = zero();
  for (const f of facilities) {
    sites[f.status]++;
    if (typeof f.capacityMw === "number" && Number.isFinite(f.capacityMw)) {
      reportedMw[f.status] += f.capacityMw;
      estimatedMw[f.status] += f.capacityMw;
    } else {
      undisclosed[f.status]++;
      estimatedMw[f.status] += IMPUTED_MW[f.status];
    }
  }
  return {
    sites,
    undisclosed,
    reportedMw,
    estimatedMw,
    operatingMw: estimatedMw.operational,
    pipelineMw:
      PIPELINE_WEIGHTS.under_construction * estimatedMw.under_construction +
      PIPELINE_WEIGHTS.proposed * estimatedMw.proposed,
  };
}

export type BuildOutBreakdown = CapacitySummary & {
  score: number; // -3 … +3
  base: number; // -3 … +2
  momentum: number; // 0 … +2
};

function steps(value: number, cuts: readonly number[]): number {
  return cuts.filter((c) => value >= c).length;
}

/** Base from operating capacity, plus momentum from the weighted pipeline, capped at +3. */
export function buildOutScore(facilities: FacilityLike[]): BuildOutBreakdown {
  const summary = summarizeCapacity(facilities);
  const base = -3 + steps(summary.operatingMw, BASE_CUTS);
  const momentum = steps(summary.pipelineMw, MOMENTUM_CUTS);
  return { ...summary, base, momentum, score: Math.min(3, base + momentum) };
}

export function buildOutBand(score: number): Band {
  return BUILD_OUT_BANDS[Math.max(0, Math.min(6, Math.round(score) + 3))]!;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export function formatMw(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
  return `${Math.round(mw).toLocaleString()} MW`;
}

/** The dossier's one-line tagline, e.g. "Major build-out, emerging AI rules". */
export function tagline(posture: number, ai: number): string {
  const reg = regulationScore(ai) === 0 ? "no AI rules" : `${regulationBand(ai).name.toLowerCase()} AI rules`;
  return `${buildOutBand(posture).name} build-out, ${reg}`;
}

/** One sentence on the regulation score, naming the strongest area. */
export function regulationSummary(
  tiers: Record<string, number | undefined>,
  labels: Record<string, string>,
): string {
  const points = regulationPoints(tiers);
  const score = regulationScore(points);
  const graded = AREA_KEYS.filter((k) => (tiers[k] ?? 0) > 0);
  if (graded.length === 0) return "No enacted AI law in any regulation area.";
  const top = [...graded].sort((a, b) => (tiers[b] ?? 0) - (tiers[a] ?? 0))[0]!;
  const topTier = TIER_NAMES[clampTier(tiers[top] ?? 0)];
  return `${regulationBand(score).name}: ${points} of ${REGULATION_MAX_POINTS} points across ${graded.length} of ${AREA_KEYS.length} areas, strongest in ${labels[top] ?? top} (${topTier}).`;
}

/** One sentence on the build-out score with the capacity behind it. */
export function buildOutSummary(b: BuildOutBreakdown): string {
  const sites = b.sites.operational + b.sites.under_construction + b.sites.proposed;
  if (sites === 0) return "No data centers tracked.";
  const pipelineSites = b.sites.under_construction + b.sites.proposed;
  const undisclosed = b.undisclosed.operational + b.undisclosed.under_construction + b.undisclosed.proposed;
  const parts = [
    `${buildOutBand(b.score).name}: about ${formatMw(b.operatingMw)} operating across ${b.sites.operational} ${b.sites.operational === 1 ? "site" : "sites"}`,
    pipelineSites > 0
      ? `${formatMw(b.estimatedMw.under_construction + b.estimatedMw.proposed)} announced or under construction at ${pipelineSites} more`
      : "nothing in the pipeline",
  ];
  const tail = undisclosed > 0 ? ` (${undisclosed} ${undisclosed === 1 ? "site" : "sites"} undisclosed, imputed).` : ".";
  return parts.join(", ") + tail;
}
