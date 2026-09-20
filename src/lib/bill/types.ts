// What the Bill Reader and the bill panel read for one bill. Built server-side
// from Convex (`bills:detail` plus the stored text) by src/lib/bill/load.ts
// and served to the client by /api/bill/[state]/[number].

import type { BillStatus } from "@/lib/map/types";

export type Takeaway = {
  title: string; // under 8 words, a claim
  text: string; // 1-2 sentences
  sectionIds: string[]; // ids from src/lib/bill/parse.ts; may be empty for unstructured texts
};

export type BillAreaAnnotation = {
  regulationArea: string;
  summary: string;
  takeaways: Takeaway[];
};

export type BillRecord = {
  externalId: string;
  state: string;
  number: string;
  title: string;
  shortTitle?: string;
  status: BillStatus;
  date: string;
  url: string;
  regulationAreas: string[];
  session: string;
  changeHash: string;
  textHash: string;
  gist?: string;
};

export type BillTextInfo = {
  textHash: string;
  mime: string;
  sectionCount?: number;
  subdivisionCount?: number;
  wordCount?: number;
  textDate?: string;
  textType?: string;
};

export type BillDetail = {
  bill: BillRecord;
  regulationAreas: BillAreaAnnotation[];
  text: string | null;
  textInfo: BillTextInfo | null;
};

/** "CA:SB 243" */
export function billKey(state: string, number: string): string {
  return `${state}:${number}`;
}

export function displayTitle(b: { title: string; shortTitle?: string }): string {
  return b.shortTitle || b.title;
}
