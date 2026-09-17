import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// The Python ingestion pipeline posts its normalized document here. This is
// intentionally separate from the public read-only product API in Next.js.
http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedToken = process.env.CONVEX_INGEST_TOKEN;
    const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expectedToken || suppliedToken !== expectedToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    const document = await request.json();
    const result = await ctx.runMutation(api.seed.importDocument, { document });
    return Response.json(result);
  }),
});

export default http;
