// Runs the Jev classifier (convex/legiscan/classify.ts) over every bill
// saved in Convex, straight from the stored text, and compares its tags
// with the ones on file. Costs one TypeSafe call per text chunk and no
// OpenAI calls. Nothing is written back.
//
//   node scripts/check-jev-tags.mts            # every saved bill
//   node scripts/check-jev-tags.mts CA TX      # only these states
//
// Reads NEXT_PUBLIC_CONVEX_URL and TYPESAFE_API_KEY from .env.local.
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { billState, chunkText, combineTags, tagQuestions, type Area } from "../convex/legiscan/classify.ts";
import { post, type SystemOneResponse } from "../convex/legiscan/typesafe.ts";

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

type Bill = { externalId: string; state: string; number: string; title: string; status: string; session: string; regulationAreas: string[] };
type Detail = { text: { url: string } | null } | null;

const areas = (await client.query(anyApi.regulationAreas.list, {})) as Area[];
const bills = ((await client.query(anyApi.bills.list, {})) as Bill[]).filter((b) => only.size === 0 || only.has(b.state));
console.log(`${bills.length} bills, ${areas.length} areas, model ${model}\n`);

const questions = tagQuestions(areas);
let calls = 0;
let tokens = 0;
let same = 0;
let dropped = 0;
let changed = 0;
const perArea: Record<string, { agree: number; added: number; removed: number }> = {};
for (const a of areas) perArea[a.key] = { agree: 0, added: 0, removed: 0 };
const started = Date.now();

for (const b of bills) {
  const detail = (await client.query(anyApi.bills.detail, { state: b.state, number: b.number })) as Detail;
  if (!detail?.text) {
    console.log(`skip ${b.state} ${b.number}: no stored text`);
    continue;
  }
  const text = await (await fetch(detail.text.url)).text();
  const parts = chunkText(text);
  const meta = { state: b.state, number: b.number, title: b.title, status: b.status as "enacted", session: b.session };
  const responses: SystemOneResponse[] = [];
  for (let i = 0; i < parts.length; i++) {
    const r = await post(key, { model, state: billState(meta, parts[i], i + 1, parts.length), questions });
    responses.push(r);
    calls++;
    tokens += r.usage.input_tokens;
  }
  const tags = combineTags(responses, areas);

  const before = new Set(b.regulationAreas);
  const after = new Set(tags.regulationAreas.map((t) => t.key));
  for (const a of areas) {
    const was = before.has(a.key);
    const is = after.has(a.key);
    if (was && is) perArea[a.key].agree++;
    else if (!was && is) perArea[a.key].added++;
    else if (was && !is) perArea[a.key].removed++;
  }
  const equal = before.size === after.size && [...before].every((k) => after.has(k));
  const probs = tags.regulationAreas.map((t) => `${t.key} ${t.probability.toFixed(2)}`).join(", ");
  if (!tags.relevant) {
    dropped++;
    console.log(`DROP  ${b.state} ${b.number} (relevance ${tags.relevance.toFixed(2)}) was [${[...before].join(", ")}] — ${b.title.slice(0, 80)}`);
  } else if (equal) {
    same++;
  } else {
    changed++;
    console.log(`DIFF  ${b.state} ${b.number} (relevance ${tags.relevance.toFixed(2)}) was [${[...before].join(", ")}] now [${probs}] — ${b.title.slice(0, 80)}`);
  }
}

console.log(`\nsame ${same}, changed ${changed}, dropped ${dropped} of ${same + changed + dropped}`);
console.log(`per area (agree / Jev adds / Jev removes):`);
for (const a of areas) {
  const p = perArea[a.key];
  console.log(`  ${a.key.padEnd(15)} ${String(p.agree).padStart(3)} / ${String(p.added).padStart(3)} / ${String(p.removed).padStart(3)}`);
}
console.log(`\n${calls} TypeSafe calls, ${tokens.toLocaleString()} input tokens (≈ $${((tokens / 1e6) * 0.042).toFixed(3)}), ${((Date.now() - started) / 1000).toFixed(0)}s`);
