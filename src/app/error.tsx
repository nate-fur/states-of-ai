"use client";

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf8] px-5">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-7 text-center">
        <p className="eyebrow">Data unavailable</p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-slate-950">The bill list could not load.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Try again. The source adapter may be temporarily unavailable.</p>
        <button onClick={reset} className="mt-6 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}
