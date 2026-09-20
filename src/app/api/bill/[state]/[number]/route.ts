import { NextResponse } from "next/server";
import { loadBillDetail } from "@/lib/bill/load";

export const dynamic = "force-dynamic";

/** One bill with annotations and full text, for the bill panel and reader. */
export async function GET(_req: Request, ctx: { params: Promise<{ state: string; number: string }> }) {
  const { state, number } = await ctx.params;
  const detail = await loadBillDetail(state, decodeURIComponent(number));
  if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(detail, { headers: { "cache-control": "private, max-age=60" } });
}
