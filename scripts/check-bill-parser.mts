// Checks src/lib/bill/parse.ts against the design handoff's corpus (three
// annotated bills with a reference parser) and against one bill converted
// from LegiScan HTML by our pipeline. Run: node scripts/check-bill-parser.mts
import fs from "node:fs";
import path from "node:path";
import { parseBill, countText } from "../src/lib/bill/parse.ts";

const dir = path.join(import.meta.dirname, "..", "data", "samples", "bill-reader");
const { BILL_TEXTS, parseBill: refParse, takeawaysOf } = await import(path.join(dir, "corpus.js"));

let failed = 0;
for (const [key, src] of Object.entries(BILL_TEXTS) as [string, { text: string }][]) {
  const ours = parseBill(src.text);
  const ref = refParse(src.text) as { id: string }[];
  const ids = new Set(ours.map((l) => l.id));
  // Our parser may split a heading's leading "(a)" into its own line (the
  // reference folds it in), so compare id sets, not positions.
  const lostIds = ref.filter((l) => !ids.has(l.id) && !/^p\d+$/.test(l.id)).length;
  const missing = (takeawaysOf(src) as { ids: string[] }[]).flatMap((t) => t.ids).filter((id) => !ids.has(id));
  const ok = lostIds === 0 && missing.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${key}: ${ours.length} lines (ref ${ref.length}), ${lostIds} reference ids lost, ${missing.length} unresolved cites`, countText(src.text, ours));
}

const converted = fs.readFileSync(path.join(dir, "CA_SB524_converted.txt"), "utf8");
const lines = parseBill(converted);
const stray = lines.filter((l, i) => l.kind === "prose" && lines.slice(0, i).some((p) => p.kind === "section"));
console.log(`${stray.length <= 1 ? "ok  " : "FAIL"} CA SB 524 (converted): ${lines.length} lines, ${stray.length} stray prose after first section`, countText(converted, lines));
if (stray.length > 1) failed++;

process.exit(failed ? 1 : 0);
