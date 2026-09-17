import { ConvexHttpClient } from "convex/browser";
import type { AIBill } from "@/lib/types";

type UntypedConvexClient = {
  query: (functionName: string, args: Record<string, string | undefined>) => Promise<unknown>;
};

/**
 * Query Convex without importing generated client bindings into the Next.js
 * build. `npx convex deploy` generates those bindings immediately before
 * Vercel builds; this adapter also preserves a no-credential local fallback.
 */
export async function getConvexBills(state?: string): Promise<AIBill[] | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;

  try {
    const client = new ConvexHttpClient(url) as unknown as UntypedConvexClient;
    const data = await client.query("bills:list", { state });
    return Array.isArray(data) ? (data as AIBill[]) : null;
  } catch {
    return null;
  }
}

export const usingConvex = () => Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
