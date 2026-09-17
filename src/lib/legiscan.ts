import { fixtureBills } from "@/lib/fixtures";
import type { AIBill } from "@/lib/types";

const LEGISCAN_URL = "https://api.legiscan.com/";

type LegiScanSearchResponse = {
  status: string;
  searchresult?: Record<string, Partial<AIBill> | string | number>;
};

type LegiScanBillResponse = {
  status: string;
  bill?: Partial<AIBill>;
};

function normalizeLegiScanBill(record: Partial<AIBill>, state: string): AIBill {
  return {
    bill_id: Number(record.bill_id),
    number: record.number ?? "Unknown bill",
    title: record.title ?? "Untitled bill",
    status: Number(record.status ?? 1),
    status_date: record.status_date ?? "",
    last_action: record.last_action ?? "No action recorded",
    last_action_date: record.last_action_date ?? "",
    url: record.url ?? "",
    state,
    chamber: record.chamber ?? "Unknown",
    session: record.session ?? "Current session",
    history: record.history ?? [],
    sponsors: record.sponsors ?? [],
    texts: record.texts ?? [],
    progress: record.progress ?? [],
    product_status: Number(record.status) >= 4 ? "enacted" : "proposed",
  };
}

/**
 * The sole bill-source adapter. It keeps product routes and UI independent
 * of whether the project is running with sample records or LegiScan access.
 */
export async function getBillsForState(state: string): Promise<AIBill[]> {
  const code = state.toUpperCase();
  const apiKey = process.env.LEGISCAN_API_KEY;

  if (!apiKey) {
    return fixtureBills.filter((bill) => bill.state === code);
  }

  try {
    const params = new URLSearchParams({
      op: "getSearch",
      key: apiKey,
      state: code,
      query: "artificial intelligence",
    });
    const response = await fetch(`${LEGISCAN_URL}?${params}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) throw new Error(`LegiScan responded ${response.status}`);
    const payload = (await response.json()) as LegiScanSearchResponse;
    if (payload.status !== "OK" || !payload.searchresult) {
      throw new Error("LegiScan returned no search results");
    }

    const searchResults = Object.entries(payload.searchresult)
      .filter(([key, value]) => key !== "summary" && typeof value === "object")
      .map(([, value]) => value as Partial<AIBill>);

    // getSearch is intentionally the discovery call; enrich each result using
    // getBill so history, sponsors, texts, and progress keep their source shape.
    const detailedResults = await Promise.all(
      searchResults.slice(0, 50).map(async (result) => {
        if (!result.bill_id) return result;
        const billParams = new URLSearchParams({
          op: "getBill",
          key: apiKey,
          id: String(result.bill_id),
        });
        const billResponse = await fetch(`${LEGISCAN_URL}?${billParams}`, {
          next: { revalidate: 3600 },
        });
        if (!billResponse.ok) return result;
        const billPayload = (await billResponse.json()) as LegiScanBillResponse;
        return billPayload.status === "OK" && billPayload.bill
          ? { ...result, ...billPayload.bill }
          : result;
      }),
    );

    return detailedResults.map((record) => normalizeLegiScanBill(record, code));
  } catch {
    // A key should improve freshness, not make the tracker unavailable.
    return fixtureBills.filter((bill) => bill.state === code);
  }
}

export const billSource = () =>
  process.env.LEGISCAN_API_KEY ? "legiscan (with fixture fallback)" : "fixture";
