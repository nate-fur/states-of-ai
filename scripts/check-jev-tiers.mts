// Runs the Jev tier agent (convex/legiscan/tier.ts) over every graded
// (state, area) from the bills saved in Convex and compares its tier with
// the one on file. One TypeSafe call per graded area, no OpenAI calls
// (notes are skipped). Nothing is written back.
//
//   node scripts/check-jev-tiers.mts            # every graded area
//   node scripts/check-jev-tiers.mts CA TX      # only these states
//
// Reads NEXT_PUBLIC_CONVEX_URL and TYPESAFE_API_KEY from .env.local.
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { Area } from "../convex/legiscan/classify.ts";
import { combineGrade, tierQuestions, tierState, TIER_NAMES, type TierBill } from "../convex/legiscan/tier.ts";
import { post } from "../convex/legiscan/typesafe.ts";

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(import.meta.dirname, "..", ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const key = env.TYPESAFE_API_KEY;
if (!key) throw new Error("TYPESAFE_API_KEY missing from .env.local");
const model = env.TYPESAFE_MODEL ?? "jev-latest";
const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
const only = new Set(process.argv.slice(2));

type Bill = TierBill & { state: string; gist: string; regulationAreas: string[] };
type Detail = { regulationAreas: { regulationArea: string; summary: string; takeaways: TierBill["takeaways"] }[] } | null;
type Grade = { state: string; regulationArea: string; tier: number; basisBillIds: string[] };

const areas = (await client.query(anyApi.regulationAreas.list, {})) as Area[];
const grades = ((await client.query(anyApi.stateRegulationAreaGrades.list, {})) as Grade[]).filter(
  (g) => only.size === 0 || only.has(g.state),
);
const bills = ((await client.query(anyApi.bills.list, {})) as Bill[]).filter((b) => only.size === 0 || only.has(b.state));

// Per-area text for every bill, as billsForArea would return it.
const byBillArea = new Map<string, { summary: string; takeaways: TierBill["takeaways"] }>();
for (const b of bills) {
  const d = (await client.query(anyApi.bills.detail, { state: b.state, number: b.number })) as Detail;
  for (const r of d?.regulationAreas ?? []) byBillArea.set(`${b.externalId}/${r.regulationArea}`, r);
}
console.log(`${grades.length} graded areas, ${bills.length} bills, model ${model}\n`);

let calls = 0;
let tokens = 0;
let same = 0;
const drift: Record<string, number> = {};
const started = Date.now();
for (const g of grades.sort((a, b) => a.state.localeCompare(b.state) || a.regulationArea.localeCompare(b.regulationArea))) {
  const area = areas.find((a) => a.key === g.regulationArea)!;
  const inArea: TierBill[] = bills
    .filter((b) => b.state === g.state && b.regulationAreas.includes(g.regulationArea))
    .map((b) => {
      const t = byBillArea.get(`${b.externalId}/${g.regulationArea}`);
      return { ...b, summary: t?.summary ?? b.gist, takeaways: t?.takeaways ?? [] };
    });
  const enacted = inArea.filter((b) => b.status === "enacted").sort((a, b) => b.date.localeCompare(a.date));
  let tier = 0;
  let confidence = 1;
  let basis: string[] = [];
  if (enacted.length > 0) {
    const r = await post(key, { model, state: tierState(g.state, area, enacted), questions: tierQuestions(area, enacted.length) });
    calls++;
    tokens += r.usage.input_tokens;
    const grade = combineGrade(r.answers, enacted);
    tier = grade.tier;
    confidence = grade.confidence;
    basis = grade.basisBillIds.map((id) => enacted.find((b) => b.externalId === id)!.number);
  }
  const delta = tier - g.tier;
  drift[delta] = (drift[delta] ?? 0) + 1;
  if (delta === 0) same++;
  else {
    const wasBasis = g.basisBillIds.map((id) => bills.find((b) => b.externalId === id)?.number ?? id);
    console.log(
      `${g.state} ${g.regulationArea.padEnd(15)} was ${g.tier} ${TIER_NAMES[g.tier].padEnd(13)} now ${tier} ${TIER_NAMES[tier].padEnd(13)} (conf ${confidence.toFixed(2)}, ${enacted.length} enacted) basis [${basis.join(", ")}] was [${wasBasis.join(", ")}]`,
    );
  }
}

console.log(`\nsame ${same} of ${grades.length}; drift (new minus old): ${JSON.stringify(drift)}`);
console.log(`${calls} TypeSafe calls, ${tokens.toLocaleString()} input tokens (≈ $${((tokens / 1e6) * 0.042).toFixed(3)}), ${((Date.now() - started) / 1000).toFixed(0)}s`);
