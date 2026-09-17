import { getAllBills, getStateBills } from "@/lib/data";
import { billSource } from "@/lib/legiscan";

export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state")?.toUpperCase();
  const bills = state ? await getStateBills(state) : await getAllBills();
  if (bills === null) {
    return Response.json({ error: `Unknown state code: ${state}` }, { status: 404 });
  }
  return Response.json({
    data: bills,
    meta: { count: bills.length, state: state ?? "ALL", billSource: billSource() },
  });
}
