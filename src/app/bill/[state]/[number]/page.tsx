import type { Metadata } from "next";
import { loadBillDetail } from "@/lib/bill/load";
import { displayTitle } from "@/lib/bill/types";
import { BillReader } from "@/components/bill/reader";

export const dynamic = "force-dynamic";

type Params = Promise<{ state: string; number: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { state, number } = await params;
  const detail = await loadBillDetail(state, decodeURIComponent(number)).catch(() => null);
  const n = decodeURIComponent(number);
  return { title: detail ? `${state.toUpperCase()} ${n} · ${displayTitle(detail.bill)}` : `${state.toUpperCase()} ${n}` };
}

/** Standalone Bill Reader at /bill/CA/SB%20243. */
export default async function BillPage({ params }: { params: Params }) {
  const { state, number } = await params;
  const abbr = state.toUpperCase();
  const n = decodeURIComponent(number);
  const detail = await loadBillDetail(abbr, n).catch((err) => {
    console.error("bill detail unavailable", err);
    return null;
  });
  return <BillReader bill={`${abbr}:${n}`} data={detail} />;
}
