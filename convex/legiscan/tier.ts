import type { ActionCtx } from "../_generated/server";
import { callWithSchema } from "./openai";
import type { Area, Takeaway } from "./classify";

// Tier agent (step 7 of docs/pipeline.md). Given every saved bill in one
// (state, area), it grades how strong that state's rules are against the
// area's rubric, says why in one sentence, and names the enacted bills
// that earn the tier.

export const TIER_NAMES = ["None", "Light", "Moderate", "Strong", "Comprehensive"] as const;

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

export type TierResult = { tier: 0 | 1 | 2 | 3 | 4; note: string; basisBillIds: string[] };

function schema(enactedIds: string[]) {
  const properties: Record<string, unknown> = {
    tier: {
      type: "integer",
      enum: [0, 1, 2, 3, 4],
      description: "0 None, 1 Light, 2 Moderate, 3 Strong, 4 Comprehensive",
    },
    note: {
      type: "string",
      description: "One sentence, at most 35 words, that reads like a caption for why this tier. Name bills by number only (SB 243). Never mention an id.",
    },
  };
  const required = ["tier", "note"];
  if (enactedIds.length > 0) {
    properties.basisBillIds = {
      type: "array",
      description: "Ids of the enacted bills that set the tier. Empty if the tier is 0.",
      items: { type: "string", enum: enactedIds },
    };
    required.push("basisBillIds");
  }
  return {
    name: "tier",
    schema: { type: "object", properties, required, additionalProperties: false },
  };
}

function systemPrompt(area: Area): string {
  const rubric = (area.rubric ?? []).map((line, i) => `${i} ${TIER_NAMES[i]}: ${line}`).join("\n");
  return `You grade how strongly a US state regulates one area of AI policy, on a 0-4 tier.

Area: ${area.label}. ${area.description}

Tier definitions for this area:
${rubric}

Tiers reflect enacted law only. Bills that are pending or proposed are context about where the state is heading; they do not raise the tier on their own. If nothing is enacted, the tier is 0 and basisBillIds is empty.

Write the note as one matter-of-fact sentence of at most 35 words that reads like a caption, for example: "SB 243 requires AI disclosure and suicide-prevention protocols for companion bots, with a private right of action but no audit duty." Name bills by number only (SB 243). The bracketed ids in the bill list are for basisBillIds only and must not appear in the note. No em dashes, no hedging.

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
  const sorted = [...bills].sort((a, b) => a.status.localeCompare(b.status) || b.date.localeCompare(a.date));
  const list = sorted.length ? sorted.map(describe).join("\n") : "(no bills)";
  const enactedIds = sorted.filter((b) => b.status === "enacted").map((b) => b.externalId);
  const text = `State: ${state}
Area: ${area.label} (${area.key})

Bills in this state tagged with the area:
${list}

Assign the tier.`;

  const result = await callWithSchema<Partial<TierResult>>(ctx, {
    system: systemPrompt(area),
    content: [{ type: "input_text", text }],
    schema: schema(enactedIds),
  });
  const tier = Math.max(0, Math.min(4, Math.round(Number(result.tier) || 0))) as TierResult["tier"];
  const allowed = new Set(enactedIds);
  const basisBillIds = tier === 0 ? [] : [...new Set((result.basisBillIds ?? []).filter((id) => allowed.has(id)))];
  return { tier, note: (result.note ?? "").trim(), basisBillIds };
}
