import type { ActionCtx } from "../_generated/server";
import { ask, topLevel, type ScoreAnswer, type ScoreQuestion } from "./typesafe";
import { tierNote, type Takeaway } from "./describe";
import type { Area } from "./classify";

// Tier agent (step 7 of docs/pipeline.md). Given every saved bill in one
// (state, area), Jev grades the state's enacted law against the area's
// five-line rubric and, bill by bill, says how far each enacted bill
// reaches on its own; code turns that into the tier and the basis bills.
// The one-sentence note is written afterwards by the generative model.

export const TIER_NAMES = ["None", "Light", "Moderate", "Strong", "Comprehensive"] as const;

export type Tier = 0 | 1 | 2 | 3 | 4;

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

export type Grade = {
  tier: Tier;
  confidence: number; // Jev's confidence in the tier, 0-1; 1 when there was nothing to grade
  basisBillIds: string[];
  billTiers: Record<string, Tier>; // each enacted bill's reach on its own
};

export type TierResult = Grade & { note: string; typesafeCalls: number; openaiCalls: number };

function billQuestionId(i: number): string {
  return `bill_${i}`;
}

/** What Jev sees: the area, and the enacted bills with the prose written for this area. Pending bills do not raise a tier, so they stay out. */
export function tierState(state: string, area: Area, enacted: TierBill[]) {
  return {
    state,
    area: { label: area.label, covers: area.description },
    bills: enacted.map((b) => ({
      number: b.number,
      title: b.shortTitle || b.title,
      enacted: b.date,
      session: b.session,
      summary: b.summary,
      takeaways: b.takeaways.map((t) => `${t.title}: ${t.text}`),
    })),
  };
}

/** The rubric as Score levels: index = tier. */
export function tierQuestions(area: Area, enactedCount: number): Record<string, ScoreQuestion> {
  const criteria = (area.rubric ?? []).map((line, i) => `${TIER_NAMES[i]}: ${line}`);
  if (criteria.length !== TIER_NAMES.length) throw new Error(`area ${area.key} needs a ${TIER_NAMES.length}-line rubric`);
  const questions: Record<string, ScoreQuestion> = {
    tier: {
      type: "score",
      instructions: "How strongly this state's enacted law, taken together across `bills`, regulates `area`.",
      criteria,
    },
  };
  for (let i = 0; i < enactedCount; i++) {
    questions[billQuestionId(i)] = {
      type: "score",
      instructions: `How strongly \`bills[${i}]\` on its own regulates \`area\`.`,
      criteria,
    };
  }
  return questions;
}

/** Turn Jev's answers into a tier and the enacted bills that carry it. */
export function combineGrade(answers: Record<string, unknown>, enacted: TierBill[]): Grade {
  const tierAnswer = answers.tier as ScoreAnswer;
  const tier = topLevel(tierAnswer) as Tier;
  const billTiers: Record<string, Tier> = {};
  enacted.forEach((b, i) => {
    const a = answers[billQuestionId(i)] as ScoreAnswer | undefined;
    billTiers[b.externalId] = a ? (topLevel(a) as Tier) : 0;
  });
  // Basis: the enacted bills that reach at least Light on their own,
  // strongest first. A tier above 0 always names at least one bill.
  let basis = enacted.filter((b) => billTiers[b.externalId] >= 1).sort((a, b) => billTiers[b.externalId] - billTiers[a.externalId]);
  if (tier > 0 && basis.length === 0 && enacted.length > 0) {
    basis = [[...enacted].sort((a, b) => billTiers[b.externalId] - billTiers[a.externalId])[0]];
  }
  return {
    tier,
    confidence: tierAnswer.confidence,
    basisBillIds: tier === 0 ? [] : basis.map((b) => b.externalId),
    billTiers,
  };
}

export async function tierArea(
  ctx: ActionCtx,
  args: { state: string; area: Area; bills: TierBill[] },
): Promise<TierResult> {
  const { state, area, bills } = args;
  const enacted = [...bills].filter((b) => b.status === "enacted").sort((a, b) => b.date.localeCompare(a.date));

  let grade: Grade;
  let typesafeCalls = 0;
  if (enacted.length === 0) {
    grade = { tier: 0, confidence: 1, basisBillIds: [], billTiers: {} };
  } else {
    const res = await ask(ctx, { state: tierState(state, area, enacted), questions: tierQuestions(area, enacted.length) });
    typesafeCalls = 1;
    grade = combineGrade(res.answers, enacted);
  }

  // Nothing at all in the area: the caption writes itself.
  if (bills.length === 0) {
    return { ...grade, note: "No bills in this area yet.", typesafeCalls, openaiCalls: 0 };
  }
  const basis = grade.basisBillIds.map((id) => enacted.find((b) => b.externalId === id)!).filter(Boolean);
  const note = await tierNote(ctx, { state, area, tier: grade.tier, tierNames: TIER_NAMES, basis, bills });
  return { ...grade, note, typesafeCalls, openaiCalls: 1 };
}
