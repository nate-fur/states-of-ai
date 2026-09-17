import { BillList } from "@/components/bill-list";
import { getAllBills } from "@/lib/data";
import { billSource } from "@/lib/legiscan";
import { stateNames } from "@/lib/fixtures";
import Link from "next/link";

export default async function BillsPage() {
  const bills = await getAllBills();
  return (
    <main className="min-h-screen bg-[#f8faf8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <p className="font-heading text-lg font-bold tracking-tight text-slate-950">
            State<span className="text-teal-700">AI</span> Index
          </p>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
          >
            ← Map
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="eyebrow">US artificial intelligence tracker</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          AI legislation, state by state.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Search and filter proposed and enacted AI bills. Each record keeps the
          source fields needed to inspect its legislative history.
        </p>
        <p className="mt-5 text-xs text-slate-500">
          50 states + DC tracked · Data source: {billSource()}
        </p>
        <BillList bills={bills} states={stateNames} />
      </div>
    </main>
  );
}
