"use client";

import { useEffect, useState } from "react";
import type { BillDetail } from "@/lib/bill/types";

// Loads one bill's annotations and text from /api/bill/[state]/[number]
// and keeps them for the session, so the panel and the reader share a fetch.

const cache = new Map<string, Promise<BillDetail | null>>();

export function fetchBillDetail(key: string): Promise<BillDetail | null> {
  let p = cache.get(key);
  if (!p) {
    const [state, number] = key.split(":");
    p = fetch(`/api/bill/${state}/${encodeURIComponent(number ?? "")}`)
      .then((r) => (r.ok ? (r.json() as Promise<BillDetail>) : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}

/** `key` is "CA:SB 243"; pass null (or enabled=false) to skip loading. */
export function useBillDetail(key: string | null, enabled = true): { data: BillDetail | null; loading: boolean } {
  // Only the fetch callback writes state, so a key change never sets state
  // synchronously inside the effect; "loading" is derived from the mismatch.
  const [res, setRes] = useState<{ key: string; data: BillDetail | null } | null>(null);
  useEffect(() => {
    if (!key || !enabled) return;
    let alive = true;
    fetchBillDetail(key).then((data) => {
      if (alive) setRes({ key, data });
    });
    return () => {
      alive = false;
    };
  }, [key, enabled]);
  if (!key || !enabled) return { data: null, loading: false };
  return res?.key === key ? { data: res.data, loading: false } : { data: null, loading: true };
}
