"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DiffView } from "@/components/map/diff-view";

function DiffInner() {
  const params = useSearchParams();
  const router = useRouter();
  const a = (params.get("a") || "UT").toUpperCase();
  const b = (params.get("b") || "VA").toUpperCase();

  return (
    <DiffView
      a={a}
      b={b}
      onChangeA={(next) => router.replace(`/diff?a=${next}&b=${b}`)}
      onChangeB={(next) => router.replace(`/diff?a=${a}&b=${next}`)}
    />
  );
}

export default function DiffPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <DiffInner />
    </Suspense>
  );
}
