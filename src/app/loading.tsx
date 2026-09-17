import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f8faf8]">
      <div className="border-b border-slate-200 bg-white px-5 py-7" />
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="mt-4 h-12 w-96 max-w-full" />
        <Skeleton className="mt-4 h-5 w-[36rem] max-w-full" />
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-20 w-full" />
          <Skeleton className="mt-2 h-20 w-full" />
        </div>
      </div>
    </main>
  );
}
