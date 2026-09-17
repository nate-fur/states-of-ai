"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AIBill } from "@/lib/types";

export function BillList({
  bills,
  states,
}: {
  bills: AIBill[];
  states: Record<string, string>;
}) {
  const [state, setState] = useState("ALL");
  const [query, setQuery] = useState("");
  const filteredBills = useMemo(() => bills.filter((bill) => {
    const matchesState = state === "ALL" || bill.state === state;
    const searchable = `${bill.number} ${bill.title} ${bill.last_action}`.toLowerCase();
    return matchesState && searchable.includes(query.toLowerCase());
  }), [bills, state, query]);

  return (
    <section className="mt-10">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Legislation</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-950">AI bills by state</h2>
            <p className="mt-1 text-sm text-slate-600">{filteredBills.length} matching bills in the current dataset.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="state-filter">Filter by state</label>
            <select id="state-filter" value={state} onChange={(event) => setState(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-700">
              <option value="ALL">All states</option>
              {Object.entries(states).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            <label className="relative">
              <span className="sr-only">Search bills</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bills" className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-700 sm:w-52" />
            </label>
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <FileText className="mx-auto size-6 text-slate-400" />
            <p className="mt-3 font-medium text-slate-900">No matching AI bills</p>
            <p className="mt-1 text-sm text-slate-600">Try another state or clear the search terms.</p>
            <button onClick={() => { setState("ALL"); setQuery(""); }} className="mt-4 text-sm font-semibold text-teal-700 hover:underline">Clear filters</button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredBills.map((bill) => (
              <li key={bill.bill_id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700">{bill.state} · {bill.number}</span>
                      <Badge variant="outline" className={bill.product_status === "enacted" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{bill.product_status}</Badge>
                    </div>
                    <h3 className="mt-2 font-semibold leading-6 text-slate-950">{bill.title}</h3>
                    <p className="mt-2 text-sm text-slate-600"><span className="font-medium text-slate-700">{bill.last_action}</span> · {bill.last_action_date}</p>
                  </div>
                  <a href={bill.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline">
                    Source <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
