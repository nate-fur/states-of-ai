import { getStateDataCenters } from "@/lib/data";

type Context = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { code } = await params;
  const datacenters = getStateDataCenters(code);
  if (!datacenters) {
    return Response.json({ error: `Unknown state code: ${code}` }, { status: 404 });
  }

  return Response.json({
    data: datacenters,
    meta: { state: code.toUpperCase(), count: datacenters.length, source: "fixture" },
  });
}
