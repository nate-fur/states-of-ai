import { getStateSummaries } from "@/lib/data";
import { billSource } from "@/lib/legiscan";

export async function GET() {
  const states = await getStateSummaries();
  return Response.json({
    data: states,
    meta: {
      count: states.length,
      billSource: billSource(),
      updatedAt: new Date().toISOString(),
    },
  });
}
