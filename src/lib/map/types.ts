export type BillStatus = "enacted" | "pending" | "proposed";

export type QuadrantKey = "brakes" | "regulate" | "slow" | "throttle";

export type Quadrant = {
  key: QuadrantKey;
  label: string;
  color: string;
};

export type MapBill = {
  n: string;
  /** Display title: the classifier's short title when present, else LegiScan's. */
  t: string;
  tags: string[];
  s: BillStatus;
  d: string;
  url?: string; // direct LegiScan bill page; absent in the seed
  gist?: string; // 1-2 plain sentences; live only
  hasText?: boolean; // true when the full text is on file, so the reader can open
  textMeta?: string; // "4 takeaways · 6 sections · 927 words"
  /** Per-area one-liner and takeaway count, keyed by regulation area. */
  areaSummaries?: Record<string, { summary: string; takeaways: number }>;
};

export type RegulationArea = {
  k: string;
  label: string;
  icon: string;
  desc: string;
  /** One line per tier, index = tier 0…4. */
  rubric?: string[];
  order?: number;
};

export type SourceLink = { label: string; url: string };

export type StateRecord = {
  abbr: string;
  name: string;
  q: Quadrant;
  posture: number;
  ai: number;
  summary: string;
  sites: { completed: number; pipeline: number };
  mw: number;
  ops: { n: string; v: number }[];
  growth: number[];
  incentives: boolean;
  preempt: boolean;
  grades?: Record<string, [number, string]>;
  bills: MapBill[];
  sources: { build: SourceLink[]; gov: SourceLink[] };
};

export type DetailSelection =
  | { abbr: string; k: string; bill?: undefined }
  | { abbr: string; bill: string; k?: undefined };
