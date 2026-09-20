# Data model

Six entities.

```
State 1 ──< many Facility
State 1 ──< many Bill
Bill  1 ──< many BillRegulationArea      (one per area the bill touches)
Bill  1 ──  0..1 BillText                (the stored plain text)
Bill  >──< RegulationArea                (many-to-many, keys on Bill)
State >──< RegulationArea                (many-to-many via StateRegulationAreaGrade)
```

A State holds only facts about the state itself. Anything countable from its
facilities or bills is derived, not stored.

---

## State

```ts
type State = {
  code: string;            // "CA"
  name: string;

  // Both axes are derived from facilities, bills, and grades once those
  // exist. Absent until then; never hand-filled.
  dataCenterPosture?: {
    score: number;         // -3 restrict … +3 accelerate
    summary: string;
  };

  aiRegulation?: {
    score: number;         // 0 none … 6 comprehensive
    summary: string;
  };

  verifiedAt?: string;     // ISO date
};
```

Quadrant is derived, not stored: `dataCenterPosture.score >= 0` and
`aiRegulation.score >= 3`.

## Facility

```ts
type Facility = {
  id: string;
  state: string;           // State.code
  name: string;
  operator: string;
  status: "operational" | "under_construction" | "proposed";
  capacityMw: number | null;   // null when undisclosed
};
```

## Bill

```ts
type Bill = {
  id: string;
  state: string;           // State.code
  number: string;          // "SB 53" (LegiScan sends "SB53"; we add the space)
  title: string;           // LegiScan's title, verbatim
  status: "enacted" | "pending" | "proposed";
  date: string;            // ISO date of that status
  url: string;
  regulationAreas: string[]; // RegulationArea.key[]; same set as its BillRegulationAreas
  session: string;         // "2025-2026 Regular Session"
  changeHash: string;      // LegiScan change_hash, for incremental runs
  textHash: string;        // LegiScan text_hash of the text the classifier read
  shortTitle: string;      // classifier: 3-7 word noun phrase, shown in lists
  gist: string;            // classifier: 1-2 plain sentences on what it does
};
```

## BillRegulationArea

One row per bill per area the bill touches. This is what the bill panel and
the Bill Reader show: how the bill moves that area, and the takeaways that
the reader highlights in the text.

```ts
type BillRegulationArea = {
  externalId: string;      // Bill.id
  state: string;           // State.code
  regulationArea: string;  // RegulationArea.key
  summary: string;         // 1 sentence: how this bill moves this area in this state
  takeaways: {
    title: string;         // under 8 words, a plain-English claim
    text: string;          // 1-2 sentences
    sectionIds: string[];  // provisions that carry it, e.g. "c22602-b-1" = § 22602(b)(1)
  }[];                     // 1-5, most important first
  textHash: string;        // the text these were written against
  reviewedAt?: string;     // ISO date once a person has checked them
};
```

Section ids come from `src/lib/bill/parse.ts`, which turns the stored text
into provisions with stable ids: `c<section>[-<sub>…]` for codified sections
and `s<n>` for uncodified act sections. The classifier sees the same ids the
reader computes, so a takeaway's citations always resolve.

## BillText

The bill's plain text, converted once from LegiScan's HTML or PDF. The text
itself is a file in Convex storage; this row is the pointer plus what the
reader shows before it loads the text.

```ts
type BillText = {
  externalId: string;      // Bill.id
  state: string;
  textHash: string;
  mime: string;            // what LegiScan sent
  storageId: string;
  chars: number;
  sectionCount?: number;
  subdivisionCount?: number;
  wordCount?: number;
  textDate?: string;       // LegiScan's date for this version
  textType?: string;       // "Chaptered", "Enrolled", "Introduced", …
};
```

## RegulationArea

```ts
type RegulationArea = {
  key: string;             // "deepfakes"
  label: string;           // "Deepfakes & elections"
  description: string;     // one line on what it covers
  icon: string;            // single glyph, e.g. "⚙"
  rubric: string[];        // 5 lines, index = tier 0…4; what each tier means for this area
  order: number;           // grid position
};
```

## StateRegulationAreaGrade

One row per state per area. Holds the graded stringency for that area in
that state and why. Bills are not attached here; "bills in this state for
this area" is a filter on Bill.

```ts
type StateRegulationAreaGrade = {
  state: string;           // State.code
  regulationArea: string;  // RegulationArea.key
  tier: 0 | 1 | 2 | 3 | 4;
  note: string;            // 1 sentence: why this tier, naming the bills that earn it
  basisBillIds: string[];  // Bill.id of the enacted bills that set the tier
  gradedAt: string;        // ISO date
};
```

Derived from grades and bills, not stored: the area's status label
(strongest bill status in the state), and "n of 50 states at this tier or
above".
