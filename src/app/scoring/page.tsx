import Link from "next/link";
import type { Metadata } from "next";
import { convexQuery, convexUrl } from "@/lib/convex";
import { CHECKLISTS, AREA_KEYS, type ChecklistElement } from "@/lib/scoring/checklists";
import {
  BASE_CUTS,
  BUILD_OUT_BANDS,
  IMPUTED_MW,
  MOMENTUM_CUTS,
  PIPELINE_WEIGHTS,
  REGULATION_BANDS,
  REGULATION_MAX_POINTS,
  TIER_NAMES,
  buildOutScore,
  formatMw,
  regulationPoints,
  regulationScore,
  type BuildOutBreakdown,
  type FacilityLike,
} from "@/lib/scoring/formulas";
import { RAMP_C, RAMP_R } from "@/lib/map/mode";
import { AREAS as SEED_AREAS } from "@/lib/map/data";

// The method behind the two scores, rendered from the same constants the
// pipeline uses (src/lib/scoring). Live counts and the worked examples come
// from Convex when it is configured; the method reads the same without them.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scoring · US AI Policy State Map",
  description: "How each state's AI regulation score and data center build-out score are computed.",
};

type Axis = { score: number; summary: string; points?: number };
type State = { code: string; name: string; dataCenterPosture?: Axis; aiRegulation?: Axis; verifiedAt?: string };
type Grade = { state: string; regulationArea: string; tier: number; elements?: string[] };
type AreaRow = { key: string; label: string; description: string; icon: string; order?: number };
type Facility = FacilityLike & { state: string };

type Live = { states: State[]; grades: Grade[]; areas: AreaRow[]; facilities: Facility[] };

async function loadLive(): Promise<Live | null> {
  if (!convexUrl()) return null;
  try {
    const [states, grades, areas, facilities] = await Promise.all([
      convexQuery<State[]>("states:list"),
      convexQuery<Grade[]>("stateRegulationAreaGrades:list"),
      convexQuery<AreaRow[]>("regulationAreas:list"),
      convexQuery<Facility[]>("facilities:list"),
    ]);
    return { states, grades, areas, facilities };
  } catch (err) {
    console.error("scoring page: live data unavailable", err);
    return null;
  }
}

/** Ramp steps at or above this index get white text, as on the map. */
const DARK_FROM = 4;
const TIER_OFF = "#D7DBE0";

/** Fill and text color for a tier 0…4 chip, using the regulation ramp. */
function tierStyle(t: number) {
  return { background: t === 0 ? TIER_OFF : RAMP_R[t + 2], color: t + 2 >= DARK_FROM ? "#fff" : "#14181D" };
}

export default async function ScoringPage() {
  const live = await loadLive();
  const areaInfo: AreaRow[] = live?.areas.length
    ? live.areas
    : SEED_AREAS.map((a) => ({ key: a.k, label: a.label, description: a.desc, icon: a.icon, order: a.order }));
  const areaByKey = Object.fromEntries(areaInfo.map((a) => [a.key, a]));
  const orderedKeys = [...AREA_KEYS].sort((a, b) => (areaByKey[a]?.order ?? 99) - (areaByKey[b]?.order ?? 99));
  const nameOf = Object.fromEntries((live?.states ?? []).map((s) => [s.code, s.name]));

  const scored = live?.states.filter((s) => s.aiRegulation && s.dataCenterPosture) ?? [];
  const regCounts = REGULATION_BANDS.map((_, i) => scored.filter((s) => s.aiRegulation!.score === i).length);
  const buildCounts = BUILD_OUT_BANDS.map((_, i) => scored.filter((s) => s.dataCenterPosture!.score === i - 3).length);
  const regCells: RampCell[] = REGULATION_BANDS.map((b, i) => ({
    score: String(i),
    name: b.name,
    sub: pointsRange(i),
    n: scored.length ? regCounts[i]! : null,
  }));
  const buildCells: RampCell[] = BUILD_OUT_BANDS.map((b, i) => ({
    score: signed(i - 3),
    name: b.name,
    sub: "",
    n: scored.length ? buildCounts[i]! : null,
  }));

  // Tiers per state per area, and which checklist elements each state has.
  const tiersByState = new Map<string, Record<string, number>>();
  const elementStates = new Map<string, Set<string>>();
  for (const g of live?.grades ?? []) {
    const t = tiersByState.get(g.state) ?? {};
    t[g.regulationArea] = g.tier;
    tiersByState.set(g.state, t);
    for (const id of g.elements ?? []) {
      const key = `${g.regulationArea}/${id}`;
      (elementStates.get(key) ?? elementStates.set(key, new Set()).get(key)!).add(g.state);
    }
  }
  const hasElements = elementStates.size > 0;
  const tierCounts = (area: string) =>
    TIER_NAMES.map((_, t) => (live?.grades ?? []).filter((g) => g.regulationArea === area && g.tier === t).length);

  // Worked examples: the state with the most regulation points, and the
  // state with the most operating capacity.
  const regExample = [...tiersByState]
    .map(([code, t]) => ({ code, t, points: regulationPoints(t) }))
    .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code))[0];
  const facByState = new Map<string, Facility[]>();
  for (const f of live?.facilities ?? []) facByState.set(f.state, [...(facByState.get(f.state) ?? []), f]);
  const buildExample = [...facByState]
    .filter(([code]) => nameOf[code])
    .map(([code, fac]) => ({ code, b: buildOutScore(fac) }))
    .sort((a, b) => b.b.operatingMw - a.b.operatingMw)[0];

  return (
    <main className="mx-auto w-full max-w-[1100px] px-9 py-7 pb-24 text-ink">
      <div className="flex items-baseline justify-between border-b border-ink pb-[18px]">
        <h1 className="m-0 font-map-serif text-[clamp(28px,3vw,40px)] leading-none font-normal tracking-[-0.02em]">
          How states <em className="font-light italic">are scored</em>
        </h1>
        <span className="flex gap-2">
          <NavLink href="/">Map</NavLink>
          <NavLink href="/data">Data</NavLink>
        </span>
      </div>

      <nav className="flex flex-wrap gap-x-5 gap-y-1 border-b border-hair py-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
        {[
          ["#glance", "At a glance"],
          ["#regulation", "1 · Regulation"],
          ["#build-out", "2 · Build-out"],
          ["#checklists", "3 · Checklists"],
          ["#limits", "4 · Limits"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="no-underline hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      <section id="glance" className="grid gap-6 pt-8 md:grid-cols-2">
        <GlanceCard
          title="AI regulation"
          range="0 to 6"
          what="How much binding AI law is on the books, across nine areas of policy."
          formula="score = band( Σ area tiers )"
          ramp={RAMP_R}
          cells={regCells}
        />
        <GlanceCard
          title="Data center build-out"
          range="−3 to +3"
          what="How much data center capacity the state has operating and has coming."
          formula="score = min( +3, base(operating MW) + momentum(pipeline MW) )"
          ramp={RAMP_C}
          cells={buildCells}
        />
      </section>
      <p className="mt-5 max-w-[72ch] font-map-serif text-[16px] leading-[1.5] text-mute text-pretty">
        Both scores are plain formulas over facts in the database, never set by hand. Only enacted law counts. Cut
        points are fixed and published here, so a score moves only when the state&apos;s own laws or facilities
        change. The map&apos;s quadrant is the pair: build-out at or above 0 is &ldquo;build&rdquo;, regulation at or
        above 3 is &ldquo;strong&rdquo;. Calibrated September 2026; revisited yearly.
      </p>

      {/* ------------------------------------------------------------------ */}
      <Section id="regulation" n="1" title="AI regulation" sub="0 to 6">
        <Steps
          items={[
            ["Classify each bill", "A model reads the full text, drops bills that are not really about AI or that failed, and tags the areas each bill touches."],
            ["Audit the checklist", "Per area, a second model marks which provisions on a fixed checklist an enacted bill contains, naming the bill. Pending bills never count."],
            ["Compute the tier", "Each provision has a level from 1 to 4: level 1 is a first, narrow duty such as a disclosure; level 4 is what completes a regime, such as enforcement or a private right of action. Tier = the highest level among the provisions met, but never more than the number of provisions met."],
            ["Add up and band", `The nine tiers are summed (0 to ${REGULATION_MAX_POINTS} points) and the total falls into one of seven bands.`],
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Caption>Tier rule · highest level met × provisions met</Caption>
            <MinGrid />
            <p className="mt-3 max-w-[44ch] font-map-serif text-[14px] leading-[1.45] text-mute text-pretty">
              Depth needs breadth. A lone private right of action (level 4) is only tier 1. Comprehensive takes four or
              more provisions including a level-4 one.
            </p>
          </div>
          <div>
            <Caption>Bands on the point total</Caption>
            <Ramp ramp={RAMP_R} cells={regCells} />
            <BandList rows={REGULATION_BANDS.map((b, i) => [String(i), b.name, b.blurb])} />
          </div>
        </div>

        {regExample && (
          <Example title={`Worked example · ${nameOf[regExample.code] ?? regExample.code}`}>
            <div className="flex flex-wrap gap-2">
              {orderedKeys.map((k) => {
                const t = regExample.t[k] ?? 0;
                return (
                  <span key={k} className="flex items-center gap-2 border border-hair bg-paper px-2.5 py-1.5 font-map-mono text-[11px] uppercase tracking-[0.06em]">
                    <span className="text-mute">{areaByKey[k]?.label ?? k}</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center px-1 text-[12px]" style={tierStyle(t)}>
                      {t}
                    </span>
                  </span>
                );
              })}
            </div>
            <Arithmetic
              rows={[
                ["Σ tiers", `${orderedKeys.map((k) => regExample.t[k] ?? 0).join(" + ")} = ${regExample.points} points`],
                ["Band", `${regExample.points} points falls in ${pointsRange(regulationScore(regExample.points))}`],
                ["Score", `${regulationScore(regExample.points)} · ${REGULATION_BANDS[regulationScore(regExample.points)]!.name}`],
              ]}
            />
          </Example>
        )}
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="build-out" n="2" title="Data center build-out" sub="−3 to +3">
        <Steps
          items={[
            ["Estimate capacity", `Sum reported megawatts per status. Undisclosed sites count at a low imputed value, not zero: ${IMPUTED_MW.operational} MW operating, ${IMPUTED_MW.under_construction} MW pipeline.`],
            ["Base from operating MW", "Estimated operating megawatts place the state on a ladder from −3 to +2."],
            ["Momentum from the pipeline", `Under-construction MW counts at ${PIPELINE_WEIGHTS.under_construction * 100}%, proposed at ${PIPELINE_WEIGHTS.proposed * 100}%. The weighted total adds 0, 1, or 2.`],
            ["Cap", "Base plus momentum, capped at +3."],
          ]}
        />

        <div className="grid gap-8 md:grid-cols-[1fr_1fr_1.4fr]">
          <div>
            <Caption>Base ladder · operating MW</Caption>
            <Ladder
              rows={[
                { label: `under ${BASE_CUTS[0]}`, value: "−3" },
                ...BASE_CUTS.map((c, i) => ({
                  label: i === BASE_CUTS.length - 1 ? `${c.toLocaleString()} +` : `${c.toLocaleString()} – ${(BASE_CUTS[i + 1]! - 1).toLocaleString()}`,
                  value: signed(i - 2),
                })),
              ]}
            />
          </div>
          <div>
            <Caption>Momentum · weighted pipeline MW</Caption>
            <Ladder
              rows={[
                { label: `under ${MOMENTUM_CUTS[0]}`, value: "+0" },
                { label: `${MOMENTUM_CUTS[0].toLocaleString()} – ${(MOMENTUM_CUTS[1] - 1).toLocaleString()}`, value: "+1" },
                { label: `${MOMENTUM_CUTS[1].toLocaleString()} +`, value: "+2" },
              ]}
            />
            <p className="mt-3 font-map-mono text-[11px] leading-[1.5] text-mute">
              pipeline = {PIPELINE_WEIGHTS.under_construction} × under construction + {PIPELINE_WEIGHTS.proposed} × proposed
            </p>
          </div>
          <div>
            <Caption>Bands</Caption>
            <Ramp ramp={RAMP_C} cells={buildCells} />
            <BandList rows={BUILD_OUT_BANDS.map((b, i) => [signed(i - 3), b.name, b.blurb])} />
          </div>
        </div>

        {buildExample && <BuildExample name={nameOf[buildExample.code] ?? buildExample.code} b={buildExample.b} />}
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="checklists" n="3" title="The checklists" sub="nine areas · four levels">
        <p className="m-0 max-w-[72ch] font-map-serif text-[16px] leading-[1.5] text-mute text-pretty">
          Each area&apos;s checklist is the whole basis for its tier. A provision counts only when an enacted bill
          clearly contains it; anything doubtful stays unchecked. Open an area to see what each tier looks like and the
          provisions behind it.
          {hasElements ? " The count beside a provision is how many states have it." : ""}
        </p>
        <div className="flex flex-col border-t border-ink">
          {orderedKeys.map((key, i) => {
            const c = CHECKLISTS[key]!;
            const a = areaByKey[key];
            const counts = live ? tierCounts(key) : null;
            return (
              <details key={key} open={i === 0} className="group border-b border-hair">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="w-5 text-center font-map-serif text-[18px] text-mute">{a?.icon}</span>
                  <span className="min-w-[200px] flex-1 font-map-serif text-[22px] leading-none tracking-[-0.01em]">{a?.label ?? key}</span>
                  {counts && <TierBar counts={counts} />}
                  <span className="font-map-mono text-[11px] uppercase tracking-[0.08em] text-dim">{c.elements.length} provisions</span>
                  <span className="w-4 text-center font-map-mono text-[16px] leading-none text-mute transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="pb-7 pl-9">
                  {a?.description && <p className="mt-0 mb-5 max-w-[72ch] font-map-serif text-[15px] leading-[1.45] text-mute text-pretty">{a.description}</p>}
                  <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
                    <div>
                      <Caption>What each tier looks like</Caption>
                      <ol className="m-0 flex list-none flex-col gap-2.5 p-0 font-map-serif text-[15px] leading-[1.4]">
                        {c.rubric.map((line, t) => (
                          <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
                            <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center font-map-mono text-[11px]" style={tierStyle(t)}>
                              {t}
                            </span>
                            <span className="text-pretty">
                              <span className="mr-2 font-map-mono text-[10px] uppercase tracking-[0.08em] text-mute">{TIER_NAMES[t]}</span>
                              {line}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <Caption>Provisions · the number is the level, 1 to 4</Caption>
                      <ul className="m-0 flex list-none flex-col p-0">
                        {c.elements.map((e) => (
                          <ElementRow key={e.id} e={e} count={hasElements ? (elementStates.get(`${key}/${e.id}`)?.size ?? 0) : null} />
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <Section id="limits" n="4" title="What the scores do not do" sub="limits">
        <ul className="m-0 grid list-none gap-x-8 gap-y-4 p-0 font-map-serif text-[15px] leading-[1.45] text-mute text-pretty md:grid-cols-2">
          {[
            ["Pending bills never move a score.", "They show in the dossier as a hollow dot on the tier scale, but only enacted law counts."],
            ["Regulation is breadth and depth, not a verdict.", "A high score means more binding rules across more areas, nothing else."],
            ["Build-out is the footprint, not the policy.", "Whether a state welcomes or restricts data centers shows up in the DC energy & water area, not here."],
            ["Capacity data is incomplete.", "Compute Atlas relies on public disclosures, so operating megawatts are undercounted in the biggest markets. Imputation softens this but does not fix it."],
            ["Executive orders and agency rules are not bills", "and are not tracked, so a state that regulates AI through regulators rather than statute scores lower than its practice."],
          ].map(([lead, rest]) => (
            <li key={lead} className="border-t border-hair pt-3">
              <span className="text-ink">{lead}</span> {rest}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

// ---------------------------------------------------------------------------

function pointsRange(i: number): string {
  const b = REGULATION_BANDS[i]!;
  const next = REGULATION_BANDS[i + 1];
  if (!next) return `${b.min}+ pts`;
  if (next.min - 1 === b.min) return `${b.min} pts`;
  return `${b.min}–${next.min - 1} pts`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border border-ink bg-paper px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
    >
      {children}
    </Link>
  );
}

function Section({ id, n, title, sub, children }: { id: string; n: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-16 flex scroll-mt-6 flex-col gap-8">
      <div className="flex items-baseline gap-4 border-b border-ink pb-3">
        <span className="font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">{n}</span>
        <h2 className="m-0 font-map-serif text-[30px] leading-none font-normal tracking-[-0.02em]">{title}</h2>
        <span className="font-map-mono text-[11px] uppercase tracking-[0.08em] text-dim">{sub}</span>
      </div>
      {children}
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">{children}</div>;
}

type RampCell = { score: string; name: string; sub: string; n: number | null };

/** The map's 7-step ramp with the band name, range, and state count under each step. */
function Ramp({ ramp, cells }: { ramp: readonly string[]; cells: RampCell[] }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((c, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div
            className="flex h-9 items-center justify-center font-map-mono text-[13px]"
            style={{ background: ramp[i], color: i >= DARK_FROM ? "#fff" : "#14181D" }}
          >
            {c.score}
          </div>
          <div className="font-map-serif text-[11px] leading-[1.2] tracking-[-0.02em] whitespace-nowrap text-ink">{c.name}</div>
          {c.sub && <div className="font-map-mono text-[10px] leading-none text-mute">{c.sub}</div>}
          {c.n !== null && <div className="font-map-mono text-[10px] leading-none text-dim">{c.n} st</div>}
        </div>
      ))}
    </div>
  );
}

function BandList({ rows }: { rows: [string, string, string][] }) {
  return (
    <ul className="mt-4 flex list-none flex-col gap-1 p-0 font-map-serif text-[14px] leading-[1.45] text-mute">
      {rows.map(([score, name, blurb]) => (
        <li key={score} className="grid grid-cols-[24px_1fr] gap-2">
          <span className="pt-[3px] font-map-mono text-[11px] text-dim">{score}</span>
          <span className="text-pretty">
            <span className="text-ink">{name}.</span> {blurb}
          </span>
        </li>
      ))}
    </ul>
  );
}

function GlanceCard({
  title,
  range,
  what,
  formula,
  ramp,
  cells,
}: {
  title: string;
  range: string;
  what: string;
  formula: string;
  ramp: readonly string[];
  cells: RampCell[];
}) {
  return (
    <div className="flex flex-col gap-4 border border-hair bg-paper-2 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-map-serif text-[24px] leading-none font-normal tracking-[-0.01em]">{title}</h2>
        <span className="font-map-mono text-[11px] uppercase tracking-[0.08em] text-mute">{range}</span>
      </div>
      <p className="m-0 font-map-serif text-[16px] leading-[1.4] text-ink-2 text-pretty">{what}</p>
      <Ramp ramp={ramp} cells={cells} />
      <code className="block border-t border-hair pt-3 font-map-mono text-[12px] text-mute">{formula}</code>
    </div>
  );
}

function Steps({ items }: { items: [string, string][] }) {
  return (
    <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-4">
      {items.map(([title, text], i) => (
        <li key={title} className="flex flex-col gap-2 border-t border-ink pt-3">
          <span className="font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">Step {i + 1}</span>
          <span className="font-map-serif text-[18px] leading-[1.15] text-ink">{title}</span>
          <span className="font-map-serif text-[14px] leading-[1.45] text-mute text-pretty">{text}</span>
        </li>
      ))}
    </ol>
  );
}

/** tier = min(highest level, provisions met), laid out as a grid. */
function MinGrid() {
  const cols = [1, 2, 3, 4];
  return (
    <div className="inline-grid grid-cols-[auto_repeat(4,44px)] gap-[3px] font-map-mono text-[12px]">
      <div className="flex items-end pb-1 pr-3 text-[10px] uppercase tracking-[0.06em] text-mute">met →</div>
      {cols.map((c) => (
        <div key={c} className="flex h-7 items-center justify-center text-mute">
          {c === 4 ? "4+" : c}
        </div>
      ))}
      {[1, 2, 3, 4].map((level) => (
        <MinRow key={level} level={level} cols={cols} />
      ))}
    </div>
  );
}

function MinRow({ level, cols }: { level: number; cols: number[] }) {
  return (
    <>
      <div className="flex h-11 items-center justify-end pr-3 text-mute">level {level}</div>
      {cols.map((met) => {
        const tier = Math.min(level, met);
        return (
          <div
            key={met}
            className="flex h-11 items-center justify-center"
            style={tierStyle(tier)}
            title={`Highest level ${level}, ${met} provisions met → tier ${tier}`}
          >
            {tier}
          </div>
        );
      })}
    </>
  );
}

/** Rows are given low to high and drawn high to low, so the ladder reads upward. */
function Ladder({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <ol className="m-0 flex list-none flex-col-reverse border-b border-ink p-0">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-hair py-2">
          <span className="font-map-mono text-[12px] text-ink">{r.label}</span>
          <span className="font-map-serif text-[16px] font-medium">{r.value}</span>
        </li>
      ))}
    </ol>
  );
}

function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border border-hair bg-paper-2 p-5">
      <Caption>{title}</Caption>
      {children}
    </div>
  );
}

function Arithmetic({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 font-map-mono text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="uppercase tracking-[0.08em] text-mute">{k}</dt>
          <dd className="m-0 text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function BuildExample({ name, b }: { name: string; b: BuildOutBreakdown }) {
  const st = (k: FacilityLike["status"]) => `${b.sites[k]} sites, ${b.undisclosed[k]} undisclosed → ${formatMw(b.estimatedMw[k])}`;
  const sum = b.base + b.momentum;
  return (
    <Example title={`Worked example · ${name}`}>
      <Arithmetic
        rows={[
          ["Operating", st("operational")],
          ["Under constr.", st("under_construction")],
          ["Proposed", st("proposed")],
          ["Base", `${formatMw(b.operatingMw)} operating → ${signed(b.base)}`],
          [
            "Momentum",
            `${PIPELINE_WEIGHTS.under_construction} × ${formatMw(b.estimatedMw.under_construction)} + ${PIPELINE_WEIGHTS.proposed} × ${formatMw(b.estimatedMw.proposed)} = ${formatMw(b.pipelineMw)} → +${b.momentum}`,
          ],
          [
            "Score",
            sum > 3
              ? `${signed(b.base)} + ${b.momentum} = ${signed(sum)}, capped at +3 · ${BUILD_OUT_BANDS[6]!.name}`
              : `${signed(b.base)} + ${b.momentum} = ${signed(b.score)} · ${BUILD_OUT_BANDS[b.score + 3]!.name}`,
          ],
        ]}
      />
    </Example>
  );
}

/** Stacked bar of how many states sit at each tier in an area. */
function TierBar({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return (
    <span className="flex h-2 w-[140px] gap-px" title={counts.map((n, t) => `${TIER_NAMES[t]} ${n}`).join(" · ")}>
      {counts.map((n, t) => (n ? <span key={t} style={{ width: `${(n / total) * 100}%`, background: tierStyle(t).background }} /> : null))}
    </span>
  );
}

function ElementRow({ e, count }: { e: ChecklistElement; count: number | null }) {
  return (
    <li className="grid grid-cols-[28px_1fr_auto] gap-3 border-b border-hair py-2 last:border-b-0">
      <span className="mt-[3px] inline-flex h-5 w-5 items-center justify-center font-map-mono text-[11px]" style={tierStyle(e.level)} title={`Level ${e.level} · ${TIER_NAMES[e.level]}`}>
        {e.level}
      </span>
      <span className="font-map-serif text-[15px] leading-[1.4]">
        <span className="text-ink">{e.label}</span>
        <span className="block text-[14px] text-mute text-pretty">{e.test}</span>
      </span>
      <span className="pt-[3px] font-map-mono text-[11px] whitespace-nowrap text-dim">{count === null ? "" : `${count} st`}</span>
    </li>
  );
}
