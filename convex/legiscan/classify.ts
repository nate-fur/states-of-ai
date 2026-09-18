import type { ActionCtx } from "../_generated/server";
import { callWithSchema, type ContentPart } from "./openai";
import { truncate, type BillStatus } from "./parse";

// Classifier agent (step 5 of docs/pipeline.md). Reads the full bill text and
// decides whether the bill is really about AI, which categories it covers,
// and writes the summary and key points.

export type Category = { key: string; label: string; description: string };

export type ClassifyInput = {
  state: string;
  number: string;
  title: string;
  status: BillStatus;
  session: string;
  text: string; // plain text, already converted from HTML or PDF
  categories: Category[];
};

export type ClassifyResult = {
  relevant: boolean;
  categories: string[];
  summary: string;
  keyPoints: string[];
};

function schema(categories: Category[]) {
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
        categories: {
          type: "array",
          description: "Regulation category keys the bill covers. Empty when not relevant.",
          items: { type: "string", enum: categories.map((c) => c.key) },
        },
        summary: {
          type: "string",
          description: "2-3 plain sentences on what the bill does. Empty when not relevant.",
        },
        keyPoints: {
          type: "array",
          description: "3-6 short bullets on the main provisions. Empty when not relevant.",
          items: { type: "string" },
        },
      },
      required: ["relevant", "categories", "summary", "keyPoints"],
      additionalProperties: false,
    },
  };
}

function systemPrompt(categories: Category[]): string {
  const list = categories.map((c) => `- ${c.key}: ${c.label}. ${c.description}`).join("\n");
  return `You classify US state bills for a map of state AI policy.

Read the bill text and decide:
1. Is the bill really about AI? Search results are fuzzy. Many bills mention artificial intelligence, algorithms, chatbots, or data centers only in passing (a definition list, a one-line study item, an unrelated appropriation). Those are not relevant.
2. If relevant, which regulation categories it covers. Use only the keys below. Pick every category the bill substantively addresses, usually one to three.
3. A 2-3 sentence summary and 3-6 short key points, written plainly for a general reader.

Regulation categories:
${list}

Answer with JSON matching the schema.`;
}

/** Build the user message: bill header plus the (truncated) text. */
export function billContent(input: ClassifyInput): ContentPart[] {
  const header = `Bill: ${input.state} ${input.number} (${input.session})\nTitle: ${input.title}\nStatus: ${input.status}\n\n`;
  return [{ type: "input_text", text: header + "Bill text:\n\n" + truncate(input.text) + "\n\nClassify this bill." }];
}

export async function classifyBill(ctx: ActionCtx, input: ClassifyInput): Promise<ClassifyResult> {
  const result = await callWithSchema<ClassifyResult>(ctx, {
    system: systemPrompt(input.categories),
    content: billContent(input),
    schema: schema(input.categories),
  });
  const known = new Set(input.categories.map((c) => c.key));
  return {
    relevant: Boolean(result.relevant),
    categories: [...new Set((result.categories ?? []).filter((k) => known.has(k)))],
    summary: result.summary ?? "",
    keyPoints: result.keyPoints ?? [],
  };
}
