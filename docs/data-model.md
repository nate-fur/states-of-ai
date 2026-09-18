# Data model

Four entities.

```
State 1 ──< many Facility
State 1 ──< many Bill
Bill  >──< RegulationCategory        (many-to-many, keys on Bill)
State >──< RegulationCategory        (many-to-many via StateCategoryGrade)
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
  number: string;          // "SB 53"
  title: string;
  status: "enacted" | "pending" | "proposed";
  date: string;            // ISO date of that status
  url: string;
  categories: string[];    // RegulationCategory.key[]
  session: string;         // "2025-2026 Regular Session"
  changeHash: string;      // LegiScan change_hash, for incremental runs
  textHash: string;        // LegiScan text_hash of the text the classifier read
  summary: string;         // written by the classifier
  keyPoints: string[];     // written by the classifier
};
```

## RegulationCategory

```ts
type RegulationCategory = {
  key: string;             // "deepfakes"
  label: string;           // "Deepfakes & elections"
  description: string;     // one line on what it covers
  icon: string;            // single glyph, e.g. "⚙"
};
```

## StateCategoryGrade

One row per state per category. Holds the hand-graded stringency for that
category in that state. Bills are not attached here; "bills in this state for
this category" is a filter on Bill.

```ts
type StateCategoryGrade = {
  state: string;           // State.code
  category: string;        // RegulationCategory.key
  tier: 0 | 1 | 2 | 3 | 4;
};
```

Derived from grades and bills, not stored: the category's status label
(strongest bill status in the state), and "n of 50 states at this tier or
above".
