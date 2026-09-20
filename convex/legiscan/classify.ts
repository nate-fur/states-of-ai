import type { ActionCtx } from "../_generated/server";
import { callWithSchema, type ContentPart } from "./openai";
import { truncate, type BillStatus } from "./parse";
import { citableIds, hasStructure, labelledText, parseBill, type BillLine } from "../../src/lib/bill/parse";

// Classifier agent (step 5 of docs/pipeline.md). Reads the full bill text,
// decides whether the bill is really about AI, and writes everything the
// bill panel and Bill Reader show: a short title, a gist, and for each
// regulation area it touches a one-line summary plus takeaways that cite
// the provisions carrying them.

export type Area = { key: string; label: string; description: string; rubric?: string[] };

export type Takeaway = { title: string; text: string; sectionIds: string[] };

export type AreaResult = { key: string; summary: string; takeaways: Takeaway[] };

export type ClassifyInput = {
  state: string;
  number: string;
  title: string;
  status: BillStatus;
  session: string;
  text: string; // plain text, already converted from HTML or PDF
  areas: Area[];
};

export type ClassifyResult = {
  relevant: boolean;
  shortTitle: string;
  gist: string;
  regulationAreas: AreaResult[];
};

/** Above this many ids the enum would dwarf the bill, so ids go unconstrained and are checked after. */
const MAX_ENUM_IDS = 1500;

function schema(areas: Area[], ids: string[] | null) {
  const sectionId = ids ? { type: "string", enum: ids } : { type: "string" };
  return {
    name: "classification",
    schema: {
      type: "object",
      properties: {
        relevant: {
          type: "boolean",
          description:
            "true only if regulating, funding, studying, or governing AI, automated decision systems, synthetic media, chatbots, or data centers is a substantial purpose of the bill. false if AI is mentioned only in passing.",
        },
        shortTitle: {
          type: "string",
          description: "3-7 word noun phrase saying what the bill is about. Empty when not relevant.",
        },
        gist: {
          type: "string",
          description: "1-2 plain sentences, at most 40 words, on what the bill does. No section numbers, no jargon. Empty when not relevant.",
        },
        regulationAreas: {
          type: "array",
          description: "One entry per regulation area the bill materially affects. Empty when not relevant.",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: areas.map((c) => c.key) },
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
                      description:
                        "Ids of the provisions that support the claim, narrowest first. Copy them from the [brackets] in the text.",
                      items: sectionId,
                    },
                  },
                  required: ["title", "text", "sectionIds"],
                  additionalProperties: false,
                },
              },
            },
            required: ["key", "summary", "takeaways"],
            additionalProperties: false,
          },
        },
      },
      required: ["relevant", "shortTitle", "gist", "regulationAreas"],
      additionalProperties: false,
    },
  };
}

// California SB 243 from the design handoff, as the worked example.
const EXAMPLE = {
  relevant: true,
  shortTitle: "Companion chatbot safeguards for minors",
  gist: "Companion chatbots in California must say they're AI, step in when a user talks about suicide, protect minors, and report to the state every year. People harmed can sue for at least $1,000 per violation.",
  regulationAreas: [
    {
      key: "chatbots",
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
    {
      key: "transparency",
      summary: "Adds one narrow disclosure duty: platforms must warn that companion chatbots may not be suitable for some minors.",
      takeaways: [
        {
          title: "A warning that chatbots may not suit some minors",
          text: "The notice must appear wherever the platform can be accessed: app, browser, or otherwise.",
          sectionIds: ["c22604"],
        },
      ],
    },
  ],
};

function systemPrompt(areas: Area[], structured: boolean): string {
  const list = areas.map((c) => `- ${c.key}: ${c.label}. ${c.description}`).join("\n");
  const citing = structured
    ? `Every provision in the text is prefixed with its id in [brackets], like [c22602-b-1] for § 22602(b)(1) or [s2] for section 2 of the act. Each takeaway cites at least one id. Cite the narrowest provisions that carry the duty, not the whole section. Copy ids exactly.`
    : `This text has no usable section structure (it came from a scan), so leave sectionIds empty.`;
  return `You annotate US state bills for a map of state AI policy. Readers are not lawyers.

Read the bill text and decide:
1. Is the bill really about AI? Search results are fuzzy. Many bills mention artificial intelligence, algorithms, chatbots, or data centers only in passing (a definition list, a one-line study item, an unrelated appropriation). Those are not relevant.
2. If relevant, which regulation areas it materially affects. Use only the keys below, usually one to three. Include an area only when the bill sets or changes rules in it.
3. For the bill: a shortTitle (3-7 words, a noun phrase saying what it is about) and a gist (1-2 sentences, hard cap 40 words, on what it does, plain English, no section numbers, no jargon).
4. For each area: a summary (1 sentence, at most 25 words, on how this bill moves this area in this state) and 1-5 takeaways, most important first. A takeaway has a title (under 8 words, a claim in plain English), a text (1-2 short sentences, at most 35 words, explaining the claim), and sectionIds. Keep it short: readers skim. ${citing}

Tone: matter-of-fact. Say what the law requires, not whether it is good. Use "must", "can't", "may". Prefer concrete nouns (operators, minors, the Office) over abstractions. No em dashes, no exclamation marks, no hedging.

Regulation areas:
${list}

Example output for California SB 243 (companion chatbots):
${JSON.stringify(EXAMPLE, null, 1)}

Answer with JSON matching the schema.`;
}

/** Build the user message: bill header plus the id-labelled, truncated text. */
export function billContent(input: ClassifyInput, lines: BillLine[]): ContentPart[] {
  const header = `Bill: ${input.state} ${input.number} (${input.session})\nTitle: ${input.title}\nStatus: ${input.status}\n\n`;
  return [{ type: "input_text", text: header + "Bill text:\n\n" + truncate(labelledText(lines)) + "\n\nAnnotate this bill." }];
}

export async function classifyBill(ctx: ActionCtx, input: ClassifyInput): Promise<ClassifyResult> {
  const lines = parseBill(input.text);
  const structured = hasStructure(lines);
  const ids = structured ? citableIds(lines) : [];
  const known = new Set(ids);

  const result = await callWithSchema<ClassifyResult>(ctx, {
    system: systemPrompt(input.areas, structured),
    content: billContent(input, lines),
    schema: schema(input.areas, structured && ids.length <= MAX_ENUM_IDS ? ids : null),
  });

  // Check everything the model may have invented: area keys and section ids.
  const areaKeys = new Set(input.areas.map((c) => c.key));
  const seen = new Set<string>();
  const regulationAreas: AreaResult[] = [];
  for (const a of result.regulationAreas ?? []) {
    if (!areaKeys.has(a.key) || seen.has(a.key)) continue;
    seen.add(a.key);
    regulationAreas.push({
      key: a.key,
      summary: a.summary ?? "",
      takeaways: (a.takeaways ?? []).slice(0, 5).map((t) => ({
        title: t.title ?? "",
        text: t.text ?? "",
        sectionIds: [...new Set((t.sectionIds ?? []).filter((id) => known.has(id)))],
      })),
    });
  }
  const relevant = Boolean(result.relevant) && regulationAreas.length > 0;
  return {
    relevant,
    shortTitle: relevant ? (result.shortTitle ?? "").trim() : "",
    gist: relevant ? (result.gist ?? "").trim() : "",
    regulationAreas: relevant ? regulationAreas : [],
  };
}
