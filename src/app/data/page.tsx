import Link from "next/link";
import { convexQuery, convexUrl } from "@/lib/convex";
import { Tabs } from "./tabs";

// Reads live from Convex on every request; nothing here is cached.
export const dynamic = "force-dynamic";

type Axis = { score: number; summary: string };
type State = { code: string; name: string; dataCenterPosture?: Axis; aiRegulation?: Axis; verifiedAt?: string };
type Category = { key: string; label: string; description: string; icon: string };
type Facility = { externalId: string; state: string; name: string; operator: string; status: string; capacityMw: number | null };
type Bill = { externalId: string; state: string; number: string; title: string; status: string; date: string; url: string; categories: string[] };
type Grade = { state: string; category: string; tier: number };

const axis = (a?: Axis) => (a ? `${a.score > 0 ? "+" : ""}${a.score}` : "—");

export default async function DataPage() {
  if (!convexUrl()) {
    return (
      <Shell>
        <p className="font-map-mono text-[13px] text-mute">NEXT_PUBLIC_CONVEX_URL is not set, so there is nothing to read.</p>
      </Shell>
    );
  }

  const [states, categories, facilities, bills, grades] = await Promise.all([
    convexQuery<State[]>("states:list"),
    convexQuery<Category[]>("regulationCategories:list"),
    convexQuery<Facility[]>("facilities:list"),
    convexQuery<Bill[]>("bills:list"),
    convexQuery<Grade[]>("stateCategoryGrades:list"),
  ]);
  states.sort((a, b) => a.code.localeCompare(b.code));

  const tabs = [
    {
      title: "States",
      count: states.length,
      content: (
        <Table
          rows={states}
          columns={["Code", "Name", "DC posture", "AI regulation", "Verified"]}
          render={(s) => [s.code, s.name, axis(s.dataCenterPosture), axis(s.aiRegulation), s.verifiedAt ?? "—"]}
        />
      ),
    },
    {
      title: "Regulation categories",
      count: categories.length,
      content: (
        <Table
          rows={categories}
          columns={["", "Key", "Label", "Description"]}
          render={(c) => [c.icon, c.key, c.label, c.description]}
        />
      ),
    },
    {
      title: "Facilities",
      count: facilities.length,
      content: (
        <Table
          rows={facilities}
          columns={["State", "Name", "Operator", "Status", "MW"]}
          render={(f) => [f.state, f.name, f.operator, f.status, f.capacityMw ?? "—"]}
        />
      ),
    },
    {
      title: "Bills",
      count: bills.length,
      content: (
        <Table
          rows={bills}
          columns={["State", "Number", "Title", "Status", "Date", "Categories"]}
          render={(b) => [b.state, b.number, b.title, b.status, b.date, b.categories.join(", ")]}
        />
      ),
    },
    {
      title: "Grades",
      count: grades.length,
      content: (
        <Table rows={grades} columns={["State", "Category", "Tier"]} render={(g) => [g.state, g.category, g.tier]} />
      ),
    },
  ];

  return (
    <Shell>
      <Tabs tabs={tabs} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1480px] px-9 py-7 pb-16 text-ink">
      <div className="flex items-baseline justify-between border-b border-ink pb-[18px]">
        <h1 className="m-0 font-map-serif text-[clamp(28px,3vw,40px)] leading-none font-normal tracking-[-0.02em]">
          Data <em className="font-light italic">in Convex</em>
        </h1>
        <Link
          href="/"
          className="border border-ink bg-paper px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
        >
          Map
        </Link>
      </div>
      <div className="pt-6">{children}</div>
    </main>
  );
}

function Table<T>({
  rows,
  columns,
  render,
}: {
  rows: T[];
  columns: string[];
  render: (row: T) => React.ReactNode[];
}) {
  return (
    <section>
      {rows.length === 0 ? (
        <p className="py-4 font-map-mono text-[12px] text-dim">No rows yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px] leading-[1.4]">
            <thead>
              <tr className="font-map-mono text-[11px] text-mute">
                {columns.map((c, i) => (
                  <th key={i} className="whitespace-nowrap py-2 pr-6 text-left font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-hair align-top">
                  {render(row).map((cell, j) => (
                    <td key={j} className={`py-2 pr-6 ${j === 0 ? "font-map-mono text-[12px]" : ""}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
