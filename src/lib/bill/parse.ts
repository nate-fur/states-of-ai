// Turns a bill's plain text into addressable provisions. Shared by the
// Convex classifier (so takeaways cite real ids) and the Bill Reader (so it
// can highlight them). Pure: no imports, no side effects. Ported from the
// design handoff's parseBill(); the reflow pass is ours, because text
// converted from LegiScan HTML or PDF arrives with stray line breaks.
//
// Ids: `c<section>[-<sub>…]` for codified sections ("c22757.12-a-1" is
// § 22757.12 (a)(1)), `s<n>[-<sub>…]` for uncodified act sections. Ids are a
// pure function of the text, so a takeaway written against one textHash
// resolves the same way every time that text is parsed.

export type LineKind = "act" | "chapter" | "section" | "sub" | "prose";

export type BillLine = {
  id: string;
  kind: LineKind;
  depth: number; // 0 for headings; subdivisions count from 1 in the order each section introduces its markers
  label: string; // "Sec. 1", "§ 22602", "(b) (1)"
  text: string;
};

// Uncodified act sections: "SECTION 1.", "Sec. 2.", "Section 3." (not "Sec. 552.051.").
const ACT = /^(SECTION|Section|SEC\.|Sec\.)\s*(\d+)\.(?!\d)\s*(.*)$/;
const CHAPTER = /^(CHAPTER|SUBCHAPTER|SUBTITLE|ARTICLE|PART)\s+([\w.]+)\.\s*(.*)$/;
// Codified sections: California "22757.12. (a) …", Texas "Sec. 552.051.  HEADING. (a) …",
// Alaska "Sec. 15.80.009.", Vermont "§ 2031.", New York "§ 227-g.", South Carolina "Section 7-25-230.".
const SECTION = /^(?:(?:§|Sec\.|Section)\s*)?(\d{3,6}(?:\.\d+)?|\d+[A-Za-z]?(?:[.-][A-Za-z0-9]+)+)\.\s*(.*)$/;
// Subdivision markers only: (a) (12) (A) (iv) and hyphenated (b-1); not "(HIPAA)".
const LEAD = /^\(([a-z]|\d{1,3}|[A-Z]|[ivx]+|[IVX]+|[a-z]-\d{1,2}|\d{1,3}-[a-z])\)\s*/;
// Numbered subsections without parentheses, as in Nevada, New York, North Dakota: "1. Any communication…".
const NUM = /^(\d{1,2}|[a-z]|[IVX]{1,5})\.\s+(?=[A-Za-z"“(])/;
// New Hampshire: "1 Department of Information Technology; Council. RSA 21-R:6 is repealed…" (number, heading, no period).
const NH_ACT = /^(\d{1,2}) ([A-Z][A-Za-z ,;'’-]{3,80}\.)\s+(.*)$/;
// Page furniture that PDFs and line-numbered HTML leave behind.
const JUNK = [
  /^[A-Z]{1,2}\.\s?\d+\s+\d+$/, // New York "A. 3930 2"
  /^\S+ - \d+ - LRB.*$/, // Illinois "SB2203 - 2 - LRB104 …"
  /^LRB\d+.*$/,
  /^LBD\d+.*$/,
  /^EXPLANATION--.*$/,
  /^\[ \] is old law to be omitted\.$/,
  /^\d{2}\.\d{4}\.\d{5}$/, // North Dakota "25.0912.01000"
];

function isMarker(line: string): boolean {
  return ACT.test(line) || CHAPTER.test(line) || SECTION.test(line) || LEAD.test(line) || NUM.test(line);
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", sect: "§", mdash: "—", ndash: "–",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…",
};

/**
 * Clean one converted text before parsing: decode entities the HTML pass
 * missed, undo letters split by markup ("S ECTION", "( A)"), strip PDF line
 * numbers when most lines carry them, and drop page furniture.
 */
export function normalize(raw: string): string[] {
  const decoded = raw
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\u00a0/g, " ");
  let lines = decoded
    .split("\n")
    .map((l) => l.replace(/[\uE000-\uF8FF\u2022\u25A0-\u25FF]/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => l && !JUNK.some((j) => j.test(l)));
  const share = (re: RegExp) => lines.filter((l) => re.test(l)).length / Math.max(1, lines.length);
  // Leading line numbers: "12 (b) "Disparate impact analysis" means …".
  if (share(/^\d{1,3} \S/) >= 0.4) lines = lines.map((l) => l.replace(/^\d{1,3} (?=\S)/, ""));
  // Trailing line numbers glued to the text: "…A person may not6".
  if (share(/[^\d\s]\d{1,2}$/) >= 0.4) lines = lines.map((l) => l.replace(/(?<=[^\d\s])\d{1,2}$/, ""));
  lines = lines.map((l) =>
    l
      .replace(/^([A-Z]) (ECTION|ection|EC\.|ec\.)\b/, "$1$2") // "S ECTION 1." split by markup
      .replace(/\( ([A-Za-z0-9-]{1,3})\)/g, "($1)") // "( A)"
      .replace(/^NEW SECTION\.\s*/, "") // Washington
      .replace(/^["“](?=(?:§|Sec\.|Section|SECTION)\s*)/, "") // quoted new sections: "§ 163-278.18A. …
      .replace(/^§\s*(\d{1,2})\.(?![\d-])/, "Sec. $1."), // New York writes act sections as "§ 2."
  );
  return lines.filter(Boolean);
}

/** True when a line ends the way a provision ends. */
function closed(line: string): boolean {
  return /[.:;!?”"’')\]]$/.test(line);
}

/**
 * Re-join lines that a text conversion split apart, so each provision is one
 * line as the parser expects:
 * - "SECTION 1." or "13663." alone takes the following line.
 * - A line that starts no marker, follows an unclosed line, or begins in
 *   lower case, is a continuation of the previous line.
 */
export function reflow(raw: string): string[] {
  const out: string[] = [];
  for (const line of normalize(raw)) {
    const prev = out[out.length - 1];
    if (prev !== undefined) {
      const bareHeading =
        /^(SECTION|Section|SEC\.|Sec\.)(\s*\d+\.)?$/.test(prev) ||
        /^(?:(?:§|Sec\.|Section)\s*)?\d[\w.-]*\.$/.test(prev) ||
        /^(\(\w{1,4}\)\s*)+$/.test(prev) ||
        /^\d{1,2}\.$/.test(prev);
      if (bareHeading && (!isMarker(line) || LEAD.test(line) || NUM.test(line))) {
        out[out.length - 1] = prev + " " + line;
        continue;
      }
      const continuation = !isMarker(line) && !ACT.test(prev) && !CHAPTER.test(prev) && (!closed(prev) || /^[a-z]/.test(line));
      if (continuation) {
        // "auto-" + "mated": a word hyphenated across a wrapped line.
        const hyphenated = /[a-z]-$/.test(prev) && /^[a-z]/.test(line);
        out[out.length - 1] = hyphenated ? prev.slice(0, -1) + line : prev + " " + line;
        continue;
      }
    }
    out.push(line);
  }
  return out;
}

/** Sentence case for SHOUTED headings, as in the handoff. */
function titleCase(s: string): string {
  return s ? s.charAt(0) + s.slice(1).toLowerCase() : s;
}

type Marker = { s: string; bare: boolean }; // bare = "1." style, no parentheses

/** Marker classes; each section learns its own depth order from the order they first appear. */
type MarkerClass = "num-bare" | "alpha-lower" | "num" | "alpha-upper" | "roman-lower" | "roman-upper";

export function parseBill(raw: string): BillLine[] {
  const out: BillLine[] = [];
  let sec: string | null = null;
  // Per-section outline state: which marker classes have appeared, in depth order, and the current path.
  let order: MarkerClass[] = [];
  let path: (string | null)[] = [];

  const reset = () => {
    order = [];
    path = [];
  };

  const prevLetter = (l: string): string => String.fromCharCode(l.charCodeAt(0) - 1);

  // "(i)" is a roman numeral unless it continues an alphabetic run ("(h)" then "(i)").
  const classify = (m: Marker): MarkerClass => {
    const l = m.s;
    if (m.bare) return /^\d+$/.test(l) ? "num-bare" : /^[IVX]+$/.test(l) ? "roman-upper" : "alpha-lower";
    if (/^\d+$/.test(l)) return "num";
    const asAlpha = (cls: MarkerClass): boolean => {
      const d = order.indexOf(cls);
      return d >= 0 && path[d] === prevLetter(l);
    };
    if (/^[ivx]+$/.test(l)) {
      if (l.length === 1 && asAlpha("alpha-lower")) return "alpha-lower";
      if (l.length === 1 && !order.includes("roman-lower") && !order.includes("alpha-lower")) return "alpha-lower";
      return "roman-lower";
    }
    if (/^[IVX]+$/.test(l)) {
      if (l.length === 1 && asAlpha("alpha-upper")) return "alpha-upper";
      if (l.length === 1 && !order.includes("roman-upper") && !order.includes("alpha-upper")) return "alpha-upper";
      return "roman-upper";
    }
    if (/^[a-z](-\d+)?$/.test(l)) return "alpha-lower";
    if (/^[A-Z]$/.test(l)) return "alpha-upper";
    return "num";
  };

  const depthOf = (m: Marker): number => {
    const cls = classify(m);
    let d = order.indexOf(cls);
    if (d < 0) {
      order.push(cls);
      d = order.length - 1;
    }
    return d + 1;
  };

  // Track the enclosing path so "(2)" after "(b) (1)" resolves to b-2.
  const subId = (subs: Marker[]): { id: string; depth: number } => {
    let depth = 1;
    for (const m of subs) {
      depth = depthOf(m);
      path = path.slice(0, depth - 1);
      while (path.length < depth - 1) path.push(null);
      path.push(m.s);
    }
    return { id: (sec || "x") + "-" + path.filter(Boolean).join("-"), depth };
  };

  const leads = (text: string): { subs: Marker[]; rest: string } => {
    const subs: Marker[] = [];
    let rest = text;
    let m: RegExpMatchArray | null;
    for (;;) {
      if ((m = rest.match(LEAD))) subs.push({ s: m[1]!, bare: false });
      else if ((m = rest.match(NUM))) subs.push({ s: m[1]!, bare: true });
      else break;
      rest = rest.slice(m[0].length);
    }
    return { subs, rest };
  };
  const label = (subs: Marker[]) => subs.map((m) => (m.bare ? `${m.s}.` : `(${m.s})`)).join(" ");
  const pushSub = (subs: Marker[], text: string) => {
    const { id, depth } = subId(subs);
    out.push({ id, kind: "sub", depth, label: label(subs), text });
  };
  // "Heading. (a) …" or "Heading. 1. …": a sentence-case heading followed by the first subdivision.
  const splitHeading = (rest: string): { head: string; rest: string } => {
    const sm = rest.match(/^([A-Z][^.]{0,80}\.)\s+((?:\(|\d{1,2}\.\s).*)$/);
    return sm ? { head: sm[1]!, rest: sm[2]! } : { head: "", rest };
  };

  const lines = reflow(raw);
  const lineNumbered = lines.filter((l) => /^\d{1,3} \S/.test(l)).length / Math.max(1, lines.length) >= 0.2;
  for (const line of lines) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(ACT))) {
      sec = "s" + m[2];
      reset();
      const { head, rest } = splitHeading(m[3] ?? "");
      const { subs, rest: body } = leads(rest);
      out.push({ id: sec, kind: "act", depth: 0, label: "Sec. " + m[2], text: subs.length ? head : head ? head + " " + body : body });
      if (subs.length) pushSub(subs, body);
      continue;
    }
    if (!lineNumbered && (m = line.match(NH_ACT))) {
      sec = "s" + m[1];
      reset();
      const { subs, rest: body } = leads(m[3] ?? "");
      out.push({ id: sec, kind: "act", depth: 0, label: "Sec. " + m[1], text: subs.length ? m[2]! : m[2] + " " + body });
      if (subs.length) pushSub(subs, body);
      continue;
    }
    if ((m = line.match(CHAPTER))) {
      const kind = m[1]!.charAt(0) + m[1]!.slice(1).toLowerCase();
      out.push({
        id: m[1]!.toLowerCase() + m[2] + "-" + out.length,
        kind: "chapter",
        depth: 0,
        label: kind + " " + m[2],
        text: titleCase(m[3] ?? ""),
      });
      continue;
    }
    if ((m = line.match(SECTION))) {
      sec = "c" + m[1]!.replace(/-/g, "_");
      reset();
      let rest = m[2] ?? "";
      let head = "";
      const hm = rest.match(/^([A-Z][A-Z0-9 ,;:&'’()-]*?\.)\s*(.*)$/);
      if (hm && !/[a-z]/.test(hm[1]!)) {
        head = titleCase(hm[1]!);
        rest = hm[2]!;
      } else {
        ({ head, rest } = splitHeading(rest));
      }
      const { subs, rest: body } = leads(rest);
      const secText = head || (subs.length ? "" : body);
      out.push({ id: sec, kind: "section", depth: 0, label: "§ " + m[1]!, text: secText });
      if (subs.length) pushSub(subs, body);
      else if (head && body) out.push({ id: sec + "-p", kind: "prose", depth: 0, label: "", text: body });
      continue;
    }
    if (LEAD.test(line) || NUM.test(line)) {
      const { subs, rest } = leads(line);
      pushSub(subs, rest);
      continue;
    }
    out.push({ id: "p" + out.length, kind: "prose", depth: 0, label: "", text: line });
  }
  // No headings at all, but top-level "1." "2." items: those are the act's sections.
  const anchored = out.some((l) => l.kind === "section" || l.kind === "act");
  const tops = out.filter((l) => l.kind === "sub" && l.depth === 1);
  if (!anchored && tops.length && tops.every((l) => /^\d+\.$/.test(l.label))) {
    for (const l of out) {
      if (!l.id.startsWith("x-")) continue;
      l.id = "s" + l.id.slice(2);
      if (l.depth === 1) {
        l.kind = "act";
        l.depth = 0;
        l.label = "Sec. " + l.label.slice(0, -1);
      }
    }
  }
  return out;
}

/** "c22757.12-a-1" → "§ 22757.12 (a)(1)"; "s5-f" → "Sec. 5 (f)". */
export function cite(id: string): string {
  const m = id.match(/^([cs])([\w.]+?)(?:-(.*))?$/);
  if (!m) return id.startsWith("x-") ? id.slice(2).split("-").map((s) => `(${s})`).join("") : id;
  const subs = m[3] ? " " + m[3].split("-").map((s) => `(${s})`).join("") : "";
  return (m[1] === "c" ? "§ " : "Sec. ") + m[2]!.replace(/_/g, "-") + subs;
}

export type TextCounts = { sectionCount: number; subdivisionCount: number; wordCount: number };

export function countText(text: string, lines: BillLine[] = parseBill(text)): TextCounts {
  return {
    sectionCount: lines.filter((l) => l.kind === "section").length,
    subdivisionCount: lines.filter((l) => l.kind === "sub").length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

/** True when the parser found real structure to cite. */
export function hasStructure(lines: BillLine[]): boolean {
  return lines.some((l) => l.kind === "section" || l.kind === "sub" || l.kind === "act");
}

/**
 * The classifier's view of the text: one line per provision, prefixed with
 * the id it may cite. Headings keep their label so the model sees context.
 */
export function labelledText(lines: BillLine[]): string {
  const citable = new Set(citableIds(lines));
  return lines
    .map((l) => {
      const tag = citable.has(l.id) ? `[${l.id}]` : "";
      const label = l.label ? l.label + " " : "";
      return `${tag} ${label}${l.text}`.trim();
    })
    .join("\n");
}

/** Ids a takeaway may cite: sections, subdivisions, and act sections. */
export function citableIds(lines: BillLine[]): string[] {
  const anchored = lines.some((l) => l.kind === "section" || l.kind === "act");
  return lines
    .filter((l) => (l.kind === "section" || l.kind === "sub" || l.kind === "act") && !(anchored && l.id.startsWith("x-")))
    .map((l) => l.id);
}
