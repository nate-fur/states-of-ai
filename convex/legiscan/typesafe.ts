import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { envNumber } from "../pipelines";

// Thin wrapper over TypeSafe's System One API (Jev). Jev does not write
// text: it takes a state plus typed questions and returns calibrated
// answers. The classifier and the tier agent use it for every decision
// (is this bill about AI, which areas, which tier); prose still comes from
// the generative model in describe.ts. Every call reserves budget first, so
// a bug cannot run past TYPESAFE_MONTHLY_CAP (default 5000).
//
// Docs: https://docs.typesafe.ai/api. Limits at the time of writing: 64k
// tokens per request, 32k for the state plus the longest question, 1,200
// requests a minute. Output tokens are free.

const URL = "https://api.typesafe.ai/v1/systemone";

export function typesafeModel(): string {
  return process.env.TYPESAFE_MODEL ?? "jev-latest";
}

export function typesafeCap(): number {
  return envNumber("TYPESAFE_MONTHLY_CAP", 5000);
}

/** Instructions may be a plain question or an object holding the question plus the data it refers to. */
export type Instructions = string | Record<string, unknown>;

export type NoulQuestion = { type: "noul"; instructions: Instructions; criteria?: { true: string; false: string } };
export type ChoiceQuestion = { type: "choice"; instructions: Instructions; criteria: Record<string, string | null> };
export type ScoreQuestion = { type: "score"; instructions: Instructions; criteria: string[] };
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: "noul"; noul: number };
export type ChoiceAnswer = { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number };
export type ScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage: { input_tokens: number; output_tokens: number };
};

const RETRIES = 3;

/** One request: every question is answered against the same state, in parallel. */
export async function ask(
  ctx: ActionCtx,
  args: { state: unknown; questions: Record<string, Question> },
): Promise<SystemOneResponse> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error("TYPESAFE_API_KEY is not set");

  await ctx.runMutation(internal.apiUsage.reserve, { api: "typesafe", cap: typesafeCap() });
  return post(key, { model: typesafeModel(), state: args.state, questions: args.questions });
}

/** The HTTP call on its own, for scripts that run outside Convex. */
export async function post(
  key: string,
  body: { model: string; state: unknown; questions: Record<string, Question> },
): Promise<SystemOneResponse> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    // Rate limited, overloaded, or a passing 5xx: back off and try again a
    // few times. (A 503 window in the first full run cost ~130 bills.)
    if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    const json = (await res.json().catch(() => ({}))) as SystemOneResponse & { detail?: unknown; error?: unknown };
    if (!res.ok) {
      const detail = json.detail ?? json.error;
      throw new Error(`TypeSafe: HTTP ${res.status} ${detail ? JSON.stringify(detail) : ""}`.trim());
    }
    if (!json.answers) throw new Error("TypeSafe: no answers in response");
    return json;
  }
}

/** The level with the most probability mass. Jev's `score` is an expectation and can sit between levels. */
export function topLevel(a: ScoreAnswer): number {
  let best = 0;
  let mass = -1;
  for (const [level, p] of Object.entries(a.probabilities)) {
    if (p > mass) {
      mass = p;
      best = Number(level);
    }
  }
  return best;
}
