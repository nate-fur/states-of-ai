// Pure helpers for the LegiScan pipeline. No Convex imports, so they can be
// exercised against data/samples/legiscan/*.json with a plain script.

// --- LegiScan response shapes (only the fields we use) ---

export type SearchHit = {
  bill_id: number;
  change_hash: string;
  bill_number: string;
  title: string;
  url: string;
  last_action_date: string;
  last_action: string;
  relevance: number;
};

/** A getSearchRaw hit: just enough to compare hashes. */
export type RawHit = { bill_id: number; change_hash: string; relevance: number };

export type RawSearchEnvelope = {
  status: string;
  searchresult: { summary: { count: number }; results?: RawHit[] };
};

export type SearchEnvelope = {
  status: string;
  searchresult: {
    summary: { page_current: number; page_total: number; count: number; query: string };
    // The hits sit next to `summary`, keyed by their index as a string.
    [index: string]: unknown;
  };
};

export type BillText = {
  doc_id: number;
  date: string;
  type: string;
  mime: string;
  text_hash: string;
};

export type Bill = {
  bill_id: number;
  change_hash: string;
  state: string;
  bill_number: string;
  title: string;
  url: string;
  status: number;
  status_date: string;
  session: { session_name: string };
  texts: BillText[];
};

export type BillTextDoc = {
  doc_id: number;
  date: string;
  mime: string;
  text_hash: string;
  doc: string; // base64
};

// --- Search ---

/** Pull the numbered hits out of a getSearch envelope. */
export function parseSearchHits(envelope: SearchEnvelope): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const [key, value] of Object.entries(envelope.searchresult)) {
    if (key === "summary") continue;
    hits.push(value as SearchHit);
  }
  return hits;
}

export function parseRawHits(envelope: RawSearchEnvelope): RawHit[] {
  return envelope.searchresult.results ?? [];
}

/** The search phrases, quoted and joined with OR so one call covers them all. */
export const PHRASES = [
  "artificial intelligence",
  "automated decision",
  "algorithmic",
  "deepfake",
  "synthetic media",
  "chatbot",
  "data center",
];

export function searchQuery(): string {
  return PHRASES.map((p) => `"${p}"`).join(" OR ");
}

/** Keep hits whose last action is on or after `since` (ISO date). */
export function sinceFilter(hits: SearchHit[], since: string): SearchHit[] {
  return hits.filter((h) => h.last_action_date >= since);
}

/** Count hits by last-action year, for sizing a sweep. */
export function byYear(hits: SearchHit[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of hits) {
    const y = h.last_action_date.slice(0, 4) || "unknown";
    out[y] = (out[y] ?? 0) + 1;
  }
  return out;
}

export function searchPageTotal(envelope: SearchEnvelope): number {
  return envelope.searchresult.summary?.page_total ?? 1;
}

/** Merge hits from several searches by bill_id, keeping the best relevance seen. */
export function mergeHits(lists: SearchHit[][]): SearchHit[] {
  const byId = new Map<number, SearchHit>();
  for (const list of lists) {
    for (const hit of list) {
      const prev = byId.get(hit.bill_id);
      if (!prev || hit.relevance > prev.relevance) byId.set(hit.bill_id, hit);
    }
  }
  // Most relevant first, then most recently acted on, so a capped run
  // spends its budget on the bills most likely to be about AI.
  return [...byId.values()].sort(
    (a, b) => b.relevance - a.relevance || b.last_action_date.localeCompare(a.last_action_date),
  );
}

// --- Status ---

export type BillStatus = "proposed" | "pending" | "enacted";

/**
 * LegiScan status codes: 1 Introduced, 2 Engrossed, 3 Enrolled, 4 Passed,
 * 5 Vetoed, 6 Failed. Vetoed and failed bills return null and are dropped.
 */
export function mapStatus(code: number): BillStatus | null {
  switch (code) {
    case 1:
      return "proposed";
    case 2:
    case 3:
      return "pending";
    case 4:
      return "enacted";
    default:
      return null;
  }
}

// --- Text ---

/** Text entries newest first: by date, then doc_id (some states send no dates). */
export function textsNewestFirst(bill: Bill): BillText[] {
  return [...(bill.texts ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.doc_id - a.doc_id);
}

/** The text entry with the latest date; ties go to the higher doc_id. */
export function latestText(bill: Bill): BillText | null {
  let best: BillText | null = null;
  for (const t of bill.texts ?? []) {
    if (!best || t.date > best.date || (t.date === best.date && t.doc_id > best.doc_id)) best = t;
  }
  return best;
}

/** Decode base64 to bytes without relying on Buffer or atob. */
export function base64ToBytes(b64: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let n = 0;
  for (const ch of clean) {
    value = (value << 6) | alphabet.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (value >> bits) & 0xff;
    }
  }
  return out.subarray(0, n);
}

export function base64ToString(b64: string): string {
  return new TextDecoder("utf-8").decode(base64ToBytes(b64));
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Strip tags from bill HTML and collapse whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export const MAX_TEXT_CHARS = 200_000; // per model call; the stored text is never cut

export function truncate(text: string, max = MAX_TEXT_CHARS): string {
  return text.length <= max ? text : text.slice(0, max) + "\n[... truncated ...]";
}
