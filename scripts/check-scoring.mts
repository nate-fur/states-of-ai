// Prints the score distributions the formulas in src/lib/scoring produce:
// build-out from the local Compute Atlas snapshot, and regulation from live
// grades when NEXT_PUBLIC_CONVEX_URL is set (reads .env.local). Use it to
// recalibrate cut points (docs/scoring.md, "Recalibration").
// Run: node scripts/check-scoring.mts
import fs from "node:fs";
import path from "node:path";
import { mapFacilities, recordsFrom } from "../convex/computeAtlas/map.ts";
import {
  BUILD_OUT_BANDS,
  REGULATION_BANDS,
  buildOutScore,
  regulationPoints,
  regulationScore,
  tierFromElements,
} from "../src/lib/scoring/formulas.ts";
import { AREA_KEYS } from "../src/lib/scoring/checklists.ts";

const root = path.join(import.meta.dirname, "..");
const TERRITORIES = new Set(["GU", "MP", "PR", "VI", "AS"]);

// ---- build-out from the local snapshot ------------------------------------
const raw = JSON.parse(fs.readFileSync(path.join(root, "data/compute-atlas/raw/facilities.json"), "utf8"));
const { rows } = mapFacilities(recordsFrom(raw));
const byState = new Map<string, typeof rows>();
for (const r of rows) {
  if (TERRITORIES.has(r.state)) continue;
  byState.set(r.state, [...(byState.get(r.state) ?? []), r]);
}
const build = [...byState].map(([state, fac]) => ({ state, ...buildOutScore(fac) })).sort((a, b) => b.score - a.score || b.operatingMw - a.operatingMw);

console.log("Build-out from data/compute-atlas/raw/facilities.json\n");
console.log("st  score base mom  operatingMW  pipelineMW  sites(op/uc/pr)  undisclosed");
for (const b of build) {
  console.log(
    `${b.state.padEnd(3)} ${sign(b.score).padStart(3)}  ${sign(b.base).padStart(3)}  ${b.momentum.toString().padStart(2)}  ${b.operatingMw.toFixed(0).padStart(10)}  ${b.pipelineMw.toFixed(0).padStart(10)}  ${`${b.sites.operational}/${b.sites.under_construction}/${b.sites.proposed}`.padStart(14)}  ${b.undisclosed.operational + b.undisclosed.under_construction + b.undisclosed.proposed}`,
  );
}
histogram(
  "Build-out distribution",
  BUILD_OUT_BANDS.map((band, i) => [`${sign(i - 3)} ${band.name}`, build.filter((b) => b.score === i - 3).length]),
);

// ---- regulation from live grades -------------------------------------------
loadEnv();
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  console.log("\nNEXT_PUBLIC_CONVEX_URL not set; skipping the regulation distribution.");
} else {
  const { ConvexHttpClient } = await import("convex/browser");
  const { anyApi } = await import("convex/server");
  const client = new ConvexHttpClient(url);
  type Grade = { state: string; regulationArea: string; tier: number; elements?: string[] };
  const grades = (await client.query(anyApi.stateRegulationAreaGrades.list, {})) as Grade[];
  const tiers = new Map<string, Record<string, number>>();
  let mismatched = 0;
  for (const g of grades) {
    const t = tiers.get(g.state) ?? {};
    t[g.regulationArea] = g.tier;
    tiers.set(g.state, t);
    // Grades written by the checklist agent must agree with the rule.
    if (g.elements && tierFromElements(g.regulationArea, g.elements).tier !== g.tier) mismatched++;
  }
  const reg = [...tiers]
    .map(([state, t]) => ({ state, points: regulationPoints(t), score: regulationScore(regulationPoints(t)), t }))
    .sort((a, b) => b.points - a.points);
  console.log(`\nRegulation from live grades (${grades.length} rows, ${tiers.size} states${mismatched ? `, ${mismatched} tier/element mismatches` : ""})\n`);
  console.log(`st  score pts  ${AREA_KEYS.map((k) => k.slice(0, 5).padStart(5)).join(" ")}`);
  for (const r of reg) {
    console.log(`${r.state.padEnd(3)} ${String(r.score).padStart(5)} ${String(r.points).padStart(3)}  ${AREA_KEYS.map((k) => String(r.t[k] ?? 0).padStart(5)).join(" ")}`);
  }
  histogram(
    "Regulation distribution",
    REGULATION_BANDS.map((band, i) => [`${i} ${band.name}`, reg.filter((r) => r.score === i).length]),
  );
}

function sign(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function histogram(title: string, rows: [string, number][]) {
  console.log(`\n${title}`);
  for (const [label, n] of rows) console.log(`  ${label.padEnd(18)} ${String(n).padStart(3)}  ${"█".repeat(n)}`);
}

/** Minimal .env.local reader so the script needs no dependency. */
function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}
