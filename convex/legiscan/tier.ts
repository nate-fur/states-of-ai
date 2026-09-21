import type { ActionCtx } from "../_generated/server";
import { callWithSchema } from "./openai";
import type { Area, Takeaway } from "./classify";
import { CHECKLISTS, type ChecklistElement } from "../../src/lib/scoring/checklists";
import { TIER_NAMES, tierFromElements } from "../../src/lib/scoring/formulas";

// Tier agent (step 7 of docs/pipeline.md). Given every saved bill in one
// (state, area), it works through the area's element checklist
// (src/lib/scoring/checklists.ts) and says which provisions the state has
// enacted, citing the bill for each. The tier is then computed by rule, not
// chosen by the model, so two runs over the same bills agree.

export { TIER_NAMES };

export type TierBill = {
  externalId: string;
  number: string;
  title: string;
  shortTitle: string;
  status: string;
  date: string;
  session: string;
  summary: string; // billRegulationAreas.summary for this area
  takeaways: Takeaway[];
};

export type TierResult = {
  tier: 0 | 1 | 2 | 3 | 4;
  note: string;
  basisBillIds: string[];
  /** Checklist element ids the state has enacted. */
  elements: string[];
  /** Whether the model was called; false when nothing is enacted. */
  called: boolean;
};

type ElementClaim = { id: string; enacted: boolean; billIds: string[] };
type AgentOutput = { elements: ElementClaim[]; note: string };

/** `enactedIds` is never empty: with nothing enacted the area is graded 0 without a call. */
function schema(elements: ChecklistElement[], enactedIds: string[]) {
  const billIds = {
    type: "array",
    description: "Ids of the enacted bills that enact this provision. Empty when not enacted.",
    items: { type: "string", enum: enactedIds },
  };
  return {
    name: "checklist",
    schema: {
      type: "object",
      properties: {
        elements: {
          type: "array",
          description: "One entry per checklist element, in the order given.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: elements.map((e) => e.id) },
              enacted: { type: "boolean", description: "true only if an ENACTED bill in the list clearly contains this provision." },
              billIds,
            },
            required: ["id", "enacted", "billIds"],
            additionalProperties: false,
          },
        },
        note: {
          type: "string",
          description:
            "One sentence, at most 35 words, that reads like a caption for what the state has on the books in this area. Name bills by number only (SB 243). Never mention an id.",
        },
      },
      required: ["elements", "note"],
      additionalProperties: false,
    },
  };
}

function systemPrompt(area: Area, elements: ChecklistElement[]): string {
  const list = elements.map((e) => `- ${e.id} (level ${e.level}): ${e.label}. Counts when: ${e.test}`).join("\n");
  return `You audit one area of a US state's AI law against a fixed checklist of provisions.

Area: ${area.label}. ${area.description}

Checklist:
${list}

For each element decide whether an ENACTED bill in the list clearly contains that provision, and name the enacted bills that do. Be strict: a provision counts only if the bill's summary or takeaways describe it, not because a similar law is common or because a pending bill would add it. Pending and proposed bills are context only; they never make an element enacted. A study or a duty on one narrow party does not satisfy an element written for a general duty. When in doubt, leave the element unenacted.

Then write the note: one matter-of-fact sentence of at most 35 words that reads like a caption for what is on the books, for example: "SB 243 requires AI disclosure and suicide-prevention protocols for companion bots, with a private right of action but no audit duty." If nothing is enacted, say so and may name the most advanced pending bill. Name bills by number only (SB 243). The bracketed ids in the bill list are for billIds only and must not appear in the note. No em dashes, no hedging.

Answer with JSON matching the schema.`;
}

function describe(b: TierBill): string {
  const points = b.takeaways.map((t) => `    - ${t.title}: ${t.text}`).join("\n");
  const name = b.shortTitle || b.title;
  return `- ${b.number} [${b.externalId}] ${b.status.toUpperCase()}, ${b.date}, ${b.session}: ${name}\n  ${b.summary}\n${points}`;
}

export async function tierArea(
  ctx: ActionCtx,
  args: { state: string; area: Area; bills: TierBill[] },
): Promise<TierResult> {
  const { state, area, bills } = args;
  const checklist = CHECKLISTS[area.key];
  if (!checklist) throw new Error(`no checklist for regulation area ${area.key}`);
  const elements = checklist.elements;

  const sorted = [...bills].sort((a, b) => a.status.localeCompare(b.status) || b.date.localeCompare(a.date));
  const enactedIds = sorted.filter((b) => b.status === "enacted").map((b) => b.externalId);

  // Nothing enacted means nothing to audit; skip the call and grade 0.
  if (enactedIds.length === 0) {
    const pending = sorted.find((b) => b.status !== "enacted");
    const note = pending
      ? `No enacted ${area.label.toLowerCase()} law in ${state}; ${pending.number} (${pending.status}) would be the first.`
      : `No ${area.label.toLowerCase()} legislation enacted in ${state}.`;
    return { tier: 0, note, basisBillIds: [], elements: [], called: false };
  }

  const list = sorted.map(describe).join("\n");
  const text = `State: ${state}
Area: ${area.label} (${area.key})

Bills in this state tagged with the area:
${list}

Work through the checklist.`;

  const result = await callWithSchema<Partial<AgentOutput>>(ctx, {
    system: systemPrompt(area, elements),
    content: [{ type: "input_text", text }],
    schema: schema(elements, enactedIds),
  });

  // Keep only claims that are enacted, known, and backed by an enacted bill.
  const allowed = new Set(enactedIds);
  const met: string[] = [];
  const basis = new Set<string>();
  for (const claim of result.elements ?? []) {
    if (!claim.enacted) continue;
    const ids = (claim.billIds ?? []).filter((id) => allowed.has(id));
    if (ids.length === 0) continue;
    met.push(claim.id);
    ids.forEach((id) => basis.add(id));
  }
  const { tier, met: known } = tierFromElements(area.key, met);
  return {
    tier,
    note: (result.note ?? "").trim(),
    basisBillIds: tier === 0 ? [] : [...basis],
    elements: known,
    called: true,
  };
}
