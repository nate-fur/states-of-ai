import type { ActionCtx } from "../_generated/server";
import { ask, type NoulAnswer, type NoulQuestion, type SystemOneResponse } from "./typesafe";
import type { BillStatus } from "./parse";

// Classifier (step 5a of docs/pipeline.md). Decides, with Jev, whether a
// bill is really about AI and which regulation areas it sets rules in. It
// writes nothing: the short title, gist, summaries, and takeaways come
// from the generative step in describe.ts, which runs only for bills that
// pass here. Every answer is a probability, so thresholds live in code and
// the raw numbers are saved for tuning.

export type Area = { key: string; label: string; description: string; rubric?: string[] };

export type ClassifyInput = {
  state: string;
  number: string;
  title: string;
  status: BillStatus;
  session: string;
  text: string; // plain text, already converted from HTML or PDF
  areas: Area[];
};

export type AreaTag = { key: string; probability: number };

export type ClassifyResult = {
  relevant: boolean;
  relevance: number; // Jev's probability that AI is a substantial purpose
  regulationAreas: AreaTag[]; // only the areas over the threshold
  calls: number; // Jev requests made (one per text chunk)
};

/** A bill is relevant when Jev gives at least this probability and at least one area passes. */
export const RELEVANT_MIN = 0.5;
/** An area counts when Jev gives at least this probability that the bill sets rules in it. */
export const AREA_MIN = 0.5;

/**
 * Jev reads at most 32k tokens of state per request. Legal text runs
 * about 3.5 characters a token, and accuracy drops as the state fills with
 * detail unrelated to the question, so long bills go in parts of this
 * many characters and the answers are combined below.
 */
export const CHUNK_CHARS = 40_000;

/** Split text into parts of at most CHUNK_CHARS, breaking at line ends. */
export function chunkText(text: string, max = CHUNK_CHARS): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = max;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest.trim() || parts.length === 0) parts.push(rest);
  return parts;
}

export function areaQuestionId(key: string): string {
  return `area_${key}`;
}

/** The questions every part of a bill is asked. Ids are for our code; the question text carries the meaning. */
export function tagQuestions(areas: Area[]): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {
    relevant: {
      type: "noul",
      instructions:
        "Regulating, funding, studying, or governing artificial intelligence, automated decision systems, algorithms, synthetic media, chatbots, or data centers is a substantial purpose of `bill`.",
      criteria: {
        true: "AI, automated decisions, synthetic media, chatbots, or data centers are a main subject of the bill: it creates, changes, funds, or studies rules or programs about them.",
        false:
          "They are mentioned only in passing: a definition, a single study item, one line in an appropriation, or an unrelated bill that happens to use the words.",
      },
    },
  };
  // Jev reads literally: an area described by four example duties would
  // miss a bill that imposes a fifth. The rubric's upper tiers ride along
  // as the ladder of what counts, and the criteria say the list is open.
  for (const a of areas) {
    questions[areaQuestionId(a.key)] = {
      type: "noul",
      instructions: {
        question: "At least one provision of `bill` regulates the subject of this regulation area.",
        area: a.label,
        subject: a.description,
        examples_of_rules: (a.rubric ?? []).slice(1),
      },
      criteria: {
        true: "The bill imposes a duty, creates a right or liability, restricts a practice, funds or studies the subject, or sets up a task force about it. The examples are not a complete list.",
        false: "The subject is absent, or appears only in a definition or a passing mention.",
      },
    };
  }
  return questions;
}

/** The state for one part of a bill. Title and status ride along so a part is read as part of a whole. */
export function billState(input: Omit<ClassifyInput, "areas" | "text">, text: string, part: number, parts: number) {
  return {
    bill: {
      state: input.state,
      number: input.number,
      title: input.title,
      status: input.status,
      session: input.session,
      ...(parts > 1 ? { part: `${part} of ${parts}` } : {}),
      text,
    },
  };
}

/**
 * Combine the answers from every part: a bill is about an area if any part
 * is, so each probability is the maximum across parts. (This over-tags an
 * omnibus bill whose one AI section fills a part on its own; the old
 * single-prompt classifier truncated such bills and had the same blind
 * spot.)
 */
export function combineTags(responses: SystemOneResponse[], areas: Area[]): Omit<ClassifyResult, "calls"> {
  const max = (id: string) =>
    Math.max(0, ...responses.map((r) => (r.answers[id] as NoulAnswer | undefined)?.noul ?? 0));
  const relevance = max("relevant");
  const tags = areas
    .map((a) => ({ key: a.key, probability: max(areaQuestionId(a.key)) }))
    .filter((t) => t.probability >= AREA_MIN)
    .sort((a, b) => b.probability - a.probability);
  const relevant = relevance >= RELEVANT_MIN && tags.length > 0;
  return { relevant, relevance, regulationAreas: relevant ? tags : [] };
}

/**
 * Why a bill was dropped, for legiscanSkips. Bills that are about AI but
 * fit none of the areas are worth finding again when an area is added.
 */
export function skipReason(relevance: number): string {
  return relevance >= RELEVANT_MIN ? "about AI, outside every area" : "not about AI";
}

export async function classifyBill(ctx: ActionCtx, input: ClassifyInput): Promise<ClassifyResult> {
  const { areas, text, ...meta } = input;
  const parts = chunkText(text);
  const questions = tagQuestions(areas);
  const responses: SystemOneResponse[] = [];
  for (let i = 0; i < parts.length; i++) {
    responses.push(await ask(ctx, { state: billState(meta, parts[i], i + 1, parts.length), questions }));
  }
  return { ...combineTags(responses, areas), calls: responses.length };
}
