import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { envNumber } from "../pipelines";

// One helper for both agents (classifier and tier). It calls the OpenAI
// Responses API with a strict JSON schema and returns the parsed object.
// Every call reserves budget first, so a bug cannot run past
// OPENAI_MONTHLY_CAP (default 500; raise it on purpose).

const URL = "https://api.openai.com/v1/responses";

export function classifierModel(): string {
  return process.env.CLASSIFIER_MODEL ?? "gpt-5-mini";
}

export function openaiCap(): number {
  return envNumber("OPENAI_MONTHLY_CAP", 500);
}

/**
 * Errors that will repeat for every bill until a person acts: our own
 * monthly cap, or the OpenAI account running dry. A batch stops on these
 * instead of spinning through its queue.
 */
export function isOutOfBudget(message: string): boolean {
  return (
    message.includes("monthly cap") ||
    message.includes("no credits remaining") || // OpenAI
    message.includes("insufficient_quota") || // OpenAI
    message.includes("billing_error") // TypeSafe HTTP 402
  );
}

export type OutputSchema = {
  name: string;
  schema: Record<string, unknown>;
};

/** A user-message content part. Bills are always sent as plain text. */
export type ContentPart = { type: "input_text"; text: string };

type ResponsesResponse = {
  status?: string;
  incomplete_details?: { reason?: string };
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text?: string; refusal?: string }>;
  }>;
  error?: { message?: string };
};

export async function callWithSchema<T>(
  ctx: ActionCtx,
  args: { system: string; content: ContentPart[]; schema: OutputSchema; maxTokens?: number },
): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  await ctx.runMutation(internal.apiUsage.reserve, { api: "openai", cap: openaiCap() });

  const body = {
    model: classifierModel(),
    // Reasoning models spend part of this on thinking, so keep it roomy.
    max_output_tokens: args.maxTokens ?? 16_000,
    instructions: args.system,
    input: [{ role: "user", content: args.content }],
    text: {
      format: { type: "json_schema", name: args.schema.name, schema: args.schema.schema, strict: true },
    },
  };

  const res = await fetch(URL, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ResponsesResponse;
  if (!res.ok) {
    throw new Error(`OpenAI: HTTP ${res.status} ${json.error?.message ?? ""}`.trim());
  }

  if (json.status === "incomplete") {
    throw new Error(`OpenAI: response incomplete (${json.incomplete_details?.reason ?? "unknown reason"})`);
  }
  const message = json.output?.find((o) => o.type === "message");
  const refusal = message?.content?.find((c) => c.type === "refusal");
  if (refusal) throw new Error(`OpenAI: request was refused: ${refusal.refusal ?? ""}`.trim());
  const text = message?.content?.find((c) => c.type === "output_text")?.text;
  if (!text) throw new Error(`OpenAI: no output (status ${json.status ?? "unknown"})`);
  return JSON.parse(text) as T;
}
