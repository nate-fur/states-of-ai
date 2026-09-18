import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { envNumber } from "../pipelines";
import {
  parseRawHits,
  parseSearchHits,
  searchPageTotal,
  type Bill,
  type BillTextDoc,
  type RawHit,
  type RawSearchEnvelope,
  type SearchEnvelope,
  type SearchHit,
} from "./parse";

// Thin wrapper over the LegiScan API. Every call reserves budget first, so a
// bug cannot run past LEGISCAN_MONTHLY_CAP (default 1000; raise it on purpose).

const BASE = "https://api.legiscan.com/";

export function legiscanCap(): number {
  return envNumber("LEGISCAN_MONTHLY_CAP", 1000);
}

async function call<T extends { status: string }>(
  ctx: ActionCtx,
  op: string,
  params: Record<string, string | number>,
): Promise<T> {
  const key = process.env.LEGISCAN_API_KEY;
  if (!key) throw new Error("LEGISCAN_API_KEY is not set");

  await ctx.runMutation(internal.apiUsage.reserve, { api: "legiscan", cap: legiscanCap() });

  const url = new URL(BASE);
  url.searchParams.set("key", key);
  url.searchParams.set("op", op);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`LegiScan ${op}: HTTP ${res.status}`);
  const body = (await res.json()) as T & { alert?: { message?: string } };
  if (body.status !== "OK") {
    throw new Error(`LegiScan ${op}: status ${body.status} ${body.alert?.message ?? ""}`.trim());
  }
  return body;
}

/**
 * Full search: 50 hits per page, each with title and last action date.
 * year: 1 = all years, 2 = current session. Used for the dated sweep.
 * Multi-word phrases must be quoted, or LegiScan turns "data center" into
 * data AND center with stemming (1,533 California hits instead of 61).
 */
export async function getSearch(
  ctx: ActionCtx,
  args: { state: string; query: string; year: number; page: number },
): Promise<SearchEnvelope> {
  return call<SearchEnvelope>(ctx, "getSearch", args);
}

/** Every page of a full search. Costs one call per page. */
export async function searchAllPages(
  ctx: ActionCtx,
  args: { state: string; query: string; year: number },
): Promise<{ hits: SearchHit[]; calls: number }> {
  const first = await getSearch(ctx, { ...args, page: 1 });
  const hits = parseSearchHits(first);
  const pages = searchPageTotal(first);
  for (let page = 2; page <= pages; page++) {
    hits.push(...parseSearchHits(await getSearch(ctx, { ...args, page })));
  }
  return { hits, calls: pages };
}

/**
 * Raw search: bill_id, change_hash, and relevance only, but every hit in a
 * single call (California's whole history came back as one page). This is
 * the cheap way to spot changed bills on later runs.
 */
export async function getSearchRaw(
  ctx: ActionCtx,
  args: { state: string; query: string; year: number },
): Promise<RawHit[]> {
  return parseRawHits(await call<RawSearchEnvelope>(ctx, "getSearchRaw", { ...args, page: 1 }));
}

export async function getBill(ctx: ActionCtx, id: number): Promise<Bill> {
  const body = await call<{ status: string; bill: Bill }>(ctx, "getBill", { id });
  return body.bill;
}

/** Base64 `doc` plus its `mime` (text/html or application/pdf). */
export async function getBillText(ctx: ActionCtx, docId: number): Promise<BillTextDoc> {
  const body = await call<{ status: string; text: BillTextDoc }>(ctx, "getBillText", { id: docId });
  return body.text;
}

