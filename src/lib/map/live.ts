import "server-only";
import { convexQuery, convexUrl } from "@/lib/convex";
import { quadrant } from "./derive";
import { TOPICS } from "./data";
import type { MapBill, StateRecord } from "./types";

// Builds the map's StateRecord shape from what the pipelines put in Convex.
// The seed JSON stays as the other source; the UI toggles between them.

type Axis = { score: number; summary: string };
type State = { code: string; name: string; dataCenterPosture?: Axis; aiRegulation?: Axis; verifiedAt?: string };
type Facility = { state: string; operator: string; status: string; capacityMw: number | null };
type Bill = { state: string; number: string; title: string; status: MapBill["s"]; date: string; url: string; categories: string[] };
type Grade = { state: string; category: string; tier: number };

export type LiveMapData = { STATES: StateRecord[]; VERIFIED: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-13" -> "Mar 13, 2026", the format the seed uses. */
function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export async function loadLiveMapData(): Promise<LiveMapData | null> {
  if (!convexUrl()) return null;
  const [states, facilities, bills, grades] = await Promise.all([
    convexQuery<State[]>("states:list"),
    convexQuery<Facility[]>("facilities:list"),
    convexQuery<Bill[]>("bills:list"),
    convexQuery<Grade[]>("stateCategoryGrades:list"),
  ]);

  const topicKeys = new Set(TOPICS.map((t) => t.k));
  const byState = <T extends { state: string }>(rows: T[]) => {
    const out: Record<string, T[]> = {};
    for (const r of rows) (out[r.state] ??= []).push(r);
    return out;
  };
  const facByState = byState(facilities);
  const billsByState = byState(bills);
  const gradesByState = byState(grades);

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
      for (const g of gradesByState[s.code] ?? []) grade[g.category] = [g.tier, ""];

      const mapBills: MapBill[] = (billsByState[s.code] ?? []).map((b) => ({
        n: b.number,
        t: b.title,
        tags: b.categories.filter((k) => topicKeys.has(k)),
        s: b.status,
        d: prettyDate(b.date),
        url: b.url,
      }));

      return {
        abbr: s.code,
        name: s.name,
        q: quadrant(posture, ai),
        posture,
        ai,
        summary: s.aiRegulation?.summary ?? "No data yet.",
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
  return { STATES, VERIFIED: latest ? prettyDate(latest) : "never" };
}
