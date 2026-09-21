import type { ActionCtx } from "../_generated/server";
import { callWithSchema, type ContentPart } from "./openai";
import { truncate, type BillStatus } from "./parse";
import { citableIds, hasStructure, labelledText, parseBill, type BillLine } from "../../src/lib/bill/parse";
import type { Area } from "./classify";
import type { TierBill } from "./tier";

// The writing step (step 5b and the note in step 7 of docs/pipeline.md).
// Everything a reader sees in prose comes from here: a bill's short title
// and gist, the one-line summary and takeaways for each regulation area
// the classifier tagged, and the caption under a state's tier. The
// generative model never decides which areas or which tier; those come
// from Jev (classify.ts, tier.ts) and are passed in.

export type Takeaway = { title: string; text: string; sectionIds: string[] };

export type AreaText = { key: string; summary: string; takeaways: Takeaway[] };

export type DescribeInput = {
  state: string;
  number: string;
  title: string;
  status: BillStatus;
  session: string;
  text: string; // plain text, already converted from HTML or PDF
  areas: Area[]; // only the areas the classifier tagged, in order
};

export type DescribeResult = {
  shortTitle: string;
  gist: string;
  regulationAreas: AreaText[];
};

/** Above this many ids the enum would dwarf the bill, so ids go unconstrained and are checked after. */
const MAX_ENUM_IDS = 1500;

function schema(areas: Area[], ids: string[] | null) {
  const sectionId = ids ? { type: "string", enum: ids } : { type: "string" };
  const areaText = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "1 sentence, at most 25 words: how this bill moves this area in this state.",
      },
      takeaways: {
        type: "array",
        description: "1-5 takeaways, most important first.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Under 8 words. A claim in plain English." },
            text: { type: "string", description: "1-2 short sentences, at most 35 words, explaining the claim." },
            sectionIds: {
              type: "array",
              description: "Ids of the provisions that support the claim, narrowest first. Copy them from the [brackets] in the text.",
              items: sectionId,
            },
          },
          required: ["title", "text", "sectionIds"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "takeaways"],
    additionalProperties: false,
  };
  // One required property per tagged area, so every area gets its text.
  const byArea: Record<string, unknown> = {};
  for (const a of areas) byArea[a.key] = areaText;
  return {
    name: "description",
    schema: {
      type: "object",
      properties: {
        shortTitle: { type: "string", description: "3-7 word noun phrase saying what the bill is about." },
        gist: {
          type: "string",
          description: "1-2 plain sentences, at most 40 words, on what the bill does. No section numbers, no jargon.",
        },
        regulationAreas: {
          type: "object",
          description: "Text for each regulation area the bill was tagged with.",
          properties: byArea,
          required: areas.map((a) => a.key),
          additionalProperties: false,
        },
      },
      required: ["shortTitle", "gist", "regulationAreas"],
      additionalProperties: false,
    },
  };
}

// California SB 243 from the design handoff, as the worked example.
const EXAMPLE = {
  shortTitle: "Companion chatbot safeguards for minors",
  gist: "Companion chatbots in California must say they're AI, step in when a user talks about suicide, protect minors, and report to the state every year. People harmed can sue for at least $1,000 per violation.",
  regulationAreas: {
    chatbots: {
      summary:
        "Sets California's first rules for companion chatbots: disclose they're AI, run a suicide-prevention protocol, add guardrails for minors, and let people sue.",
      takeaways: [
        {
          title: "The bot has to admit it's a bot",
          text: "If a reasonable person might think they're talking to a human, the operator must clearly say the chatbot is AI.",
          sectionIds: ["c22602-a"],
        },
        {
          title: "A suicide-prevention protocol is mandatory",
          text: "Operators can't run a companion chatbot without a protocol that stops self-harm content and points users to a crisis line. The protocol must be published online.",
          sectionIds: ["c22602-b-1", "c22602-b-2"],
        },
        {
          title: "Extra guardrails for known minors",
          text: "Disclose it's AI, remind them every three hours to take a break, and take reasonable steps to block sexual content.",
          sectionIds: ["c22602-c", "c22602-c-1", "c22602-c-2", "c22602-c-3"],
        },
        {
          title: "Anyone harmed can sue",
          text: "Injunctions, at least $1,000 per violation (or actual damages if higher), plus attorney's fees.",
          sectionIds: ["c22605", "c22605-a", "c22605-b", "c22605-c"],
        },
      ],
    },
    transparency: {
      summary: "Adds one narrow disclosure duty: platforms must warn that companion chatbots may not be suitable for some minors.",
      takeaways: [
        {
          title: "A warning that chatbots may not suit some minors",
          text: "The notice must appear wherever the platform can be accessed: app, browser, or otherwise.",
          sectionIds: ["c22604"],
        },
      ],
    },
  },
};

function systemPrompt(areas: Area[], structured: boolean): string {
  const list = areas.map((c) => `- ${c.key}: ${c.label}. ${c.description}`).join("\n");
  const citing = structured
    ? `Every provision in the text is prefixed with its id in [brackets], like [c22602-b-1] for § 22602(b)(1) or [s2] for section 2 of the act. Each takeaway cites at least one id. Cite the narrowest provisions that carry the duty, not the whole section. Copy ids exactly.`
    : `This text has no usable section structure (it came from a scan), so leave sectionIds empty.`;
  return `You annotate US state bills for a map of state AI policy. Readers are not lawyers.

The bill has already been tagged with the regulation areas below. Do not add or drop areas; write for each one.

Read the bill text and write:
1. For the bill: a shortTitle (3-7 words, a noun phrase saying what it is about) and a gist (1-2 sentences, hard cap 40 words, on what it does, plain English, no section numbers, no jargon).
2. For each area: a summary (1 sentence, at most 25 words, on how this bill moves this area in this state) and 1-5 takeaways, most important first. A takeaway has a title (under 8 words, a claim in plain English), a text (1-2 short sentences, at most 35 words, explaining the claim), and sectionIds. Keep it short: readers skim. ${citing}

Tone: matter-of-fact. Say what the law requires, not whether it is good. Use "must", "can't", "may". Prefer concrete nouns (operators, minors, the Office) over abstractions. No em dashes, no exclamation marks, no hedging.

Regulation areas tagged on this bill:
${list}

Example output for California SB 243 (companion chatbots), tagged chatbots and transparency:
${JSON.stringify(EXAMPLE, null, 1)}

Answer with JSON matching the schema.`;
}

/** Build the user message: bill header plus the id-labelled, truncated text. */
export function billContent(input: DescribeInput, lines: BillLine[]): ContentPart[] {
  const header = `Bill: ${input.state} ${input.number} (${input.session})\nTitle: ${input.title}\nStatus: ${input.status}\n\n`;
  return [{ type: "input_text", text: header + "Bill text:\n\n" + truncate(labelledText(lines)) + "\n\nAnnotate this bill." }];
}

type RawDescription = {
  shortTitle?: string;
  gist?: string;
  regulationAreas?: Record<string, { summary?: string; takeaways?: Partial<Takeaway>[] }>;
};

export async function describeBill(ctx: ActionCtx, input: DescribeInput): Promise<DescribeResult> {
  if (input.areas.length === 0) throw new Error("describeBill: no areas tagged");
  const lines = parseBill(input.text);
  const structured = hasStructure(lines);
  const ids = structured ? citableIds(lines) : [];
  const known = new Set(ids);

  const result = await callWithSchema<RawDescription>(ctx, {
    system: systemPrompt(input.areas, structured),
    content: billContent(input, lines),
    schema: schema(input.areas, structured && ids.length <= MAX_ENUM_IDS ? ids : null),
  });

  // Check the section ids the model may have invented; the areas are fixed by the schema.
  const regulationAreas: AreaText[] = input.areas.map((a) => {
    const text = result.regulationAreas?.[a.key];
    return {
      key: a.key,
      summary: (text?.summary ?? "").trim(),
      takeaways: (text?.takeaways ?? []).slice(0, 5).map((t) => ({
        title: t.title ?? "",
        text: t.text ?? "",
        sectionIds: [...new Set((t.sectionIds ?? []).filter((id) => known.has(id)))],
      })),
    };
  });
  return {
    shortTitle: (result.shortTitle ?? "").trim(),
    gist: (result.gist ?? "").trim(),
    regulationAreas,
  };
}

// The tier caption. Jev has already picked the tier and the basis bills;
// this only puts them into one sentence.

function describeTierBill(b: TierBill): string {
  const points = b.takeaways.map((t) => `    - ${t.title}: ${t.text}`).join("\n");
  const name = b.shortTitle || b.title;
  return `- ${b.number} ${b.status.toUpperCase()}, ${b.date}, ${b.session}: ${name}\n  ${b.summary}\n${points}`;
}

export async function tierNote(
  ctx: ActionCtx,
  args: { state: string; area: Area; tier: number; tierNames: readonly string[]; basis: TierBill[]; bills: TierBill[] },
): Promise<string> {
  const { state, area, tier, tierNames, basis, bills } = args;
  const rubric = (area.rubric ?? []).map((line, i) => `${i} ${tierNames[i]}: ${line}`).join("\n");
  const basisList = basis.length ? basis.map(describeTierBill).join("\n") : "(none)";
  const others = bills.filter((b) => !basis.some((x) => x.externalId === b.externalId));
  const otherList = others.length ? others.map(describeTierBill).join("\n") : "(none)";
  const system = `You write one-sentence captions for a map of state AI policy. Readers are not lawyers.

Area: ${area.label}. ${area.description}

Tier definitions for this area:
${rubric}

The state's tier has already been decided. Write one matter-of-fact sentence of at most 35 words that reads like a caption for why it holds that tier, for example: "SB 243 requires AI disclosure and suicide-prevention protocols for companion bots, with a private right of action but no audit duty." Name bills by number only (SB 243). Lead with the enacted bills that earn the tier. If the tier is 0, say what is missing or pending. No em dashes, no hedging.

Answer with JSON matching the schema.`;
  const text = `State: ${state}
Area: ${area.label}
Tier: ${tier} ${tierNames[tier] ?? ""}

Enacted bills that earn the tier:
${basisList}

Other bills tagged with the area (pending, or enacted but not part of the basis):
${otherList}

Write the caption.`;
  const result = await callWithSchema<{ note?: string }>(ctx, {
    system,
    content: [{ type: "input_text", text }],
    schema: {
      name: "tier_note",
      schema: {
        type: "object",
        properties: { note: { type: "string", description: "One sentence, at most 35 words." } },
        required: ["note"],
        additionalProperties: false,
      },
    },
  });
  return (result.note ?? "").trim();
}
