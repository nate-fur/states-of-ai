import "server-only";
import { convexQuery, convexUrl } from "@/lib/convex";
import type { BillAreaAnnotation, BillDetail, BillRecord, BillTextInfo } from "./types";

type DetailRow = {
  bill: BillRecord;
  regulationAreas: BillAreaAnnotation[];
  text: (BillTextInfo & { url: string | null }) | null;
};

/**
 * One bill with its annotations and full text. The text lives in Convex file
 * storage; `bills:detail` hands back a signed URL that is fetched here so the
 * client never sees storage URLs.
 */
export async function loadBillDetail(state: string, number: string): Promise<BillDetail | null> {
  if (!convexUrl()) return null;
  const row = await convexQuery<DetailRow | null>("bills:detail", {
    state: state.toUpperCase(),
    number: number,
  });
  if (!row) return null;
  let text: string | null = null;
  let textInfo: BillTextInfo | null = null;
  if (row.text) {
    const { url, ...info } = row.text;
    textInfo = info;
    if (url) {
      try {
        const res = await fetch(url);
        if (res.ok) text = await res.text();
      } catch (err) {
        console.error("bill text fetch failed", err);
      }
    }
  }
  return { bill: row.bill, regulationAreas: row.regulationAreas ?? [], text, textInfo };
}
