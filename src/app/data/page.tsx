import Link from "next/link";
import { convexQuery, convexUrl } from "@/lib/convex";
import { Tabs } from "./tabs";
import { Table } from "./table";
import { Facilities, type FacilityRow } from "./facilities";
import { Bills, type BillRow } from "./bills";

// Reads live from Convex on every request; nothing here is cached.
export const dynamic = "force-dynamic";

type Axis = { score: number; summary: string };
type State = { code: string; name: string; dataCenterPosture?: Axis; aiRegulation?: Axis; verifiedAt?: string };
type Area = { key: string; label: string; description: string; icon: string };
type Grade = { state: string; regulationArea: string; tier: number };
type Usage = { api: string; month: string; calls: number };
type Run = { job: string; startedAt: number; finishedAt?: number; ok?: boolean; summary: string };

const axis = (a?: Axis) => (a ? `${a.score > 0 ? "+" : ""}${a.score}` : "—");

export default async function DataPage() {
  if (!convexUrl()) {
    return (
      <Shell>
        <p className="font-map-mono text-[13px] text-mute">NEXT_PUBLIC_CONVEX_URL is not set, so there is nothing to read.</p>
      </Shell>
    );
  }

  const [states, areas, facilities, bills, grades, usage, runs] = await Promise.all([
    convexQuery<State[]>("states:list"),
    convexQuery<Area[]>("regulationAreas:list"),
    convexQuery<FacilityRow[]>("facilities:list"),
    convexQuery<BillRow[]>("bills:list"),
    convexQuery<Grade[]>("stateAreaGrades:list"),
    convexQuery<Usage[]>("apiUsage:list"),
    convexQuery<Run[]>("pipelineRuns:list"),
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
      title: "Regulation areas",
      count: areas.length,
      content: (
        <Table
          rows={areas}
          columns={["", "Key", "Label", "Description"]}
          render={(c) => [c.icon, c.key, c.label, c.description]}
        />
      ),
    },
    {
      title: "Facilities",
      count: facilities.length,
      content: <Facilities rows={facilities} />,
    },
    {
      title: "Bills",
      count: bills.length,
      content: <Bills rows={bills} areas={areas} />,
    },
    {
      title: "Grades",
      count: grades.length,
      content: (
        <Table rows={grades} columns={["State", "Area", "Tier"]} render={(g) => [g.state, g.regulationArea, g.tier]} />
      ),
    },
    {
      title: "API usage",
      count: usage.length,
      content: (
        <Table rows={usage} columns={["API", "Month", "Calls"]} render={(u) => [u.api, u.month, u.calls]} />
      ),
    },
    {
      title: "Pipeline runs",
      count: runs.length,
      content: (
        <Table
          rows={runs}
          columns={["Job", "Started", "Result", "Summary"]}
          render={(r) => [
            r.job,
            new Date(r.startedAt).toISOString().replace("T", " ").slice(0, 16),
            r.finishedAt === undefined ? "running" : r.ok ? "ok" : "failed",
            r.summary,
          ]}
        />
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
