import { getStateBills } from "@/lib/data";
import { billSource } from "@/lib/legiscan";

type Context = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { code } = await params;
  const bills = await getStateBills(code);
  if (!bills) {
    return Response.json({ error: `Unknown state code: ${code}` }, { status: 404 });
  }

  return Response.json({
    data: bills,
    meta: { state: code.toUpperCase(), billSource: billSource(), count: bills.length },
  });
}
