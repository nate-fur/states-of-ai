import type { ActionCtx } from "../_generated/server";
import { callWithSchema } from "./openai";
import type { Category } from "./classify";

// Tier agent (step 7 of docs/pipeline.md). Given every saved bill in one
// (state, category), it grades how strong that state's rules are.

export const TIER_NAMES = ["None", "Light", "Moderate", "Strong", "Comprehensive"] as const;

export type TierBill = {
  number: string;
  title: string;
  status: string;
  date: string;
  session: string;
  summary: string;
  keyPoints: string[];
};

export type TierResult = { tier: 0 | 1 | 2 | 3 | 4; reason: string };

const schema = {
  name: "tier",
  schema: {
    type: "object",
    properties: {
      tier: {
        type: "integer",
        enum: [0, 1, 2, 3, 4],
        description: "0 None, 1 Light, 2 Moderate, 3 Strong, 4 Comprehensive",
      },
      reason: { type: "string", description: "One or two sentences on why." },
    },
    required: ["tier", "reason"],
    additionalProperties: false,
  },
};

const SYSTEM = `You grade how strongly a US state regulates one area of AI policy, on a 0-4 tier:

0 None: no enacted law in this area.
1 Light: enacted law touches the area narrowly (a study, a disclosure in one setting, a task force).
2 Moderate: enacted law sets real but limited obligations, or covers only part of the area.
3 Strong: enacted law sets broad, binding obligations with enforcement.
4 Comprehensive: enacted law covers the area thoroughly with binding duties, enforcement, and broad scope.

Tiers reflect enacted law only. Bills that are pending or proposed are context about where the state is heading; they do not raise the tier on their own. If nothing is enacted, the tier is 0.

Answer with JSON matching the schema.`;

function describe(b: TierBill): string {
  const points = b.keyPoints.map((p) => `    - ${p}`).join("\n");
  return `- ${b.number} [${b.status.toUpperCase()}, ${b.date}, ${b.session}] ${b.title}\n  ${b.summary}\n${points}`;
}

export async function tierCategory(
  ctx: ActionCtx,
  args: { state: string; category: Category; bills: TierBill[] },
): Promise<TierResult> {
  const { state, category, bills } = args;
  const sorted = [...bills].sort((a, b) => a.status.localeCompare(b.status) || b.date.localeCompare(a.date));
  const list = sorted.length ? sorted.map(describe).join("\n") : "(no bills)";
  const text = `State: ${state}
Category: ${category.label} (${category.key}). ${category.description}

Bills in this state tagged with the category:
${list}

Assign the tier.`;

  const result = await callWithSchema<TierResult>(ctx, {
    system: SYSTEM,
    content: [{ type: "input_text", text }],
    schema,
  });
  const tier = Math.max(0, Math.min(4, Math.round(Number(result.tier) || 0))) as TierResult["tier"];
  return { tier, reason: result.reason ?? "" };
}
