export type BillStatus = "enacted" | "pending" | "proposed";

export type QuadrantKey = "brakes" | "regulate" | "slow" | "throttle";

export type Quadrant = {
  key: QuadrantKey;
  label: string;
  color: string;
};

export type MapBill = {
  n: string;
  t: string;
  tags: string[];
  s: BillStatus;
  d: string;
  url?: string; // direct LegiScan bill page; absent in the seed
};

export type Topic = {
  k: string;
  label: string;
  icon: string;
  desc: string;
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
