import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

/**
 * Server-side read access to the Convex deployment. Uses the untyped `anyApi`
 * so the Next.js build does not depend on `convex/_generated`, which is only
 * written when a deployment is connected.
 */
export function convexUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_CONVEX_URL;
}

export async function convexQuery<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const url = convexUrl();
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  const client = new ConvexHttpClient(url);
  const [file, fn] = name.split(":");
  return (await client.query(anyApi[file][fn], args)) as T;
}
