import { Suspense } from "react";
import { Broadsheet } from "@/components/map/broadsheet";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <Broadsheet />
    </Suspense>
  );
}
