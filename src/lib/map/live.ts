import "server-only";
import { convexQuery, convexUrl } from "@/lib/convex";
import { quadrant } from "./derive";
import { tagline } from "@/lib/scoring/formulas";
import { AREAS as SEED_AREAS } from "./data";
import type { MapBill, RegulationArea, StateRecord } from "./types";

// Builds the map's StateRecord shape from what the pipelines put in Convex.
// The seed JSON stays as the other source; the UI toggles between them.

type Axis = { score: number; summary: string };
type State = { code: string; name: string; dataCenterPosture?: Axis; aiRegulation?: Axis; verifiedAt?: string };
type Facility = { state: string; operator: string; status: string; capacityMw: number | null };
type Bill = {
  externalId: string;
  state: string;
  number: string;
  title: string;
  shortTitle?: string;
  status: MapBill["s"];
  date: string;
  url: string;
  regulationAreas: string[];
  gist?: string;
};
type Grade = { state: string; regulationArea: string; tier: number; note?: string };
type AreaRow = { key: string; label: string; description: string; icon: string; rubric?: string[]; order?: number };
type AreaSummary = { externalId: string; state: string; regulationArea: string; summary: string; takeawayCount: number };
type TextRow = { externalId: string; sectionCount?: number; subdivisionCount?: number; wordCount?: number };

export type LiveMapData = { STATES: StateRecord[]; AREAS: RegulationArea[]; VERIFIED: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-13" -> "Mar 13, 2026", the format the seed uses. */
function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Optional queries: tolerate a deployment that has not shipped them yet. */
async function optional<T>(name: string, fallback: T): Promise<T> {
  try {
    return await convexQuery<T>(name);
  } catch {
    console.warn(`live map: ${name} unavailable; continuing without it`);
    return fallback;
  }
}

export async function loadLiveMapData(): Promise<LiveMapData | null> {
  if (!convexUrl()) return null;
  const [states, facilities, bills, grades, areaRows, summaries, texts] = await Promise.all([
    convexQuery<State[]>("states:list"),
    convexQuery<Facility[]>("facilities:list"),
    convexQuery<Bill[]>("bills:list"),
    convexQuery<Grade[]>("stateRegulationAreaGrades:list"),
    convexQuery<AreaRow[]>("regulationAreas:list"),
    optional<AreaSummary[]>("billRegulationAreas:summaries", []),
    optional<TextRow[]>("billTexts:list", []),
  ]);

  const seedByKey = Object.fromEntries(SEED_AREAS.map((a) => [a.k, a]));
  const AREAS: RegulationArea[] = areaRows
    .map((a, i) => ({
      k: a.key,
      label: a.label,
      icon: a.icon,
      desc: a.description,
      rubric: a.rubric ?? seedByKey[a.key]?.rubric,
      order: a.order ?? seedByKey[a.key]?.order ?? i,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const areaKeys = new Set(AREAS.map((t) => t.k));

  const byState = <T extends { state: string }>(rows: T[]) => {
    const out: Record<string, T[]> = {};
    for (const r of rows) (out[r.state] ??= []).push(r);
    return out;
  };
  const facByState = byState(facilities);
  const billsByState = byState(bills);
  const gradesByState = byState(grades);
  const summariesByBill: Record<string, AreaSummary[]> = {};
  for (const s of summaries) (summariesByBill[s.externalId] ??= []).push(s);
  const textByBill = Object.fromEntries(texts.map((t) => [t.externalId, t]));

  const STATES: StateRecord[] = states
    .map((s) => {
      const fac = facByState[s.code] ?? [];
      const operational = fac.filter((f) => f.status === "operational");
      const mw = operational.reduce((a, f) => a + (f.capacityMw ?? 0), 0);

      // Top operators by share of operating capacity.
      const byOp: Record<string, number> = {};
      for (const f of operational) byOp[f.operator || "Undisclosed"] = (byOp[f.operator || "Undisclosed"] ?? 0) + (f.capacityMw ?? 0);
      const ops = Object.entries(byOp)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([n, v]) => ({ n, v: Math.round((v / mw) * 100) }));

      const posture = s.dataCenterPosture?.score ?? 0;
      const ai = s.aiRegulation?.score ?? 0;
      const grade: Record<string, [number, string]> = {};
      for (const g of gradesByState[s.code] ?? []) grade[g.regulationArea] = [g.tier, g.note ?? ""];

      const mapBills: MapBill[] = (billsByState[s.code] ?? []).map((b) => {
        const rows = summariesByBill[b.externalId] ?? [];
        const areaSummaries: MapBill["areaSummaries"] = {};
        for (const r of rows) areaSummaries[r.regulationArea] = { summary: r.summary, takeaways: r.takeawayCount };
        const takeaways = rows.reduce((a, r) => a + r.takeawayCount, 0);
        const text = textByBill[b.externalId];
        // The pipeline only keeps bills whose text it converted, so every
        // live bill has text on file even when billTexts:list is unavailable.
        const meta = [plural(takeaways, "takeaway")];
        if (text?.sectionCount !== undefined) meta.push(plural(text.sectionCount, "section"));
        if (text?.wordCount !== undefined) meta.push(`${text.wordCount.toLocaleString()} words`);
        return {
          n: b.number,
          t: b.shortTitle || b.title,
          tags: b.regulationAreas.filter((k) => areaKeys.has(k)),
          s: b.status,
          d: prettyDate(b.date),
          url: b.url,
          gist: b.gist,
          hasText: true,
          textMeta: meta.join(" · "),
          areaSummaries,
        };
      });

      return {
        abbr: s.code,
        name: s.name,
        q: quadrant(posture, ai),
        posture,
        ai,
        summary: s.aiRegulation && s.dataCenterPosture ? tagline(posture, ai) : "No data yet.",
        sites: { completed: operational.length, pipeline: fac.length - operational.length },
        mw,
        ops,
        growth: [mw, mw, mw, mw, mw, mw], // no history yet; reads as 0% growth
        incentives: false,
        preempt: false,
        grades: grade,
        bills: mapBills,
        sources: {
          build: [{ label: "Compute Atlas", url: "https://www.compute-atlas.com/" }],
          gov: [{ label: "LegiScan", url: `https://legiscan.com/${s.code}` }],
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const latest = states.map((s) => s.verifiedAt ?? "").sort().at(-1);
  return { STATES, AREAS, VERIFIED: latest ? prettyDate(latest) : "never" };
}
