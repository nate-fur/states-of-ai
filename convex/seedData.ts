// Every state plus the nine regulation areas. Each area's rubric (one line
// per tier 0…4) and element checklist live in src/lib/scoring/checklists.ts;
// order is the grid position. Scores are not seeded; they are derived from
// facilities, bills, and grades.

import { CHECKLISTS } from "../src/lib/scoring/checklists";

const AREA_INFO = [
  {
    key: "frontier",
    label: "Frontier duties",
    icon: "⚙",
    order: 0,
    description:
      "Obligations on developers of the largest general-purpose models: publishing safety frameworks, testing for catastrophic risk, reporting critical incidents to the state, and whistleblower protections for lab employees.",
  },
  {
    key: "transparency",
    label: "Transparency",
    icon: "◎",
    order: 1,
    description:
      "Duties to tell people when AI is in the loop: notices that content is AI-generated, disclosure when a consequential decision was automated, and documentation that developers must hand to deployers.",
  },
  {
    key: "chatbots",
    label: "Chatbots & minors",
    icon: "☺",
    order: 2,
    description:
      "Rules for conversational and companion AI, especially with children: identity disclosure, self-harm protocols, limits on engagement-maximizing design, and parental controls.",
  },
  {
    key: "gov",
    label: "Government use",
    icon: "▤",
    order: 3,
    description:
      "How state agencies may buy and use AI: inventories of systems in use, procurement standards, impact assessments before deployment, and human review of automated decisions.",
  },
  {
    key: "dc",
    label: "DC energy & water",
    icon: "⚡",
    order: 4,
    description:
      "Data center build-out policy: grid interconnection and cost-allocation rules for large loads, water and energy reporting, siting review, and the tax incentives that attract or condition new campuses.",
  },
  {
    key: "discrimination",
    label: "Algorithmic discrimination",
    icon: "⚖",
    order: 5,
    description:
      "Protections against biased outcomes from high-risk systems in housing, lending, education, and similar domains: risk management programs, impact assessments, and a right to appeal.",
  },
  {
    key: "deepfakes",
    label: "Deepfakes & elections",
    icon: "▣",
    order: 6,
    description:
      "Restrictions on synthetic media: disclosure or bans for deceptive political content near elections, and remedies for non-consensual intimate imagery and digital replicas.",
  },
  {
    key: "employment",
    label: "Employment",
    icon: "⌂",
    order: 7,
    description:
      "AI in hiring, promotion, and workplace monitoring: notice to candidates and workers, bias audits of screening tools, and limits on using proxies for protected characteristics.",
  },
  {
    key: "health",
    label: "Health & insurance",
    icon: "+",
    order: 8,
    description:
      "AI in clinical and coverage decisions: disclosure when providers use generative AI, human review of utilization and claims denials, and limits on automated underwriting.",
  },
] as const;

export const AREAS = AREA_INFO.map((a) => {
  const checklist = CHECKLISTS[a.key];
  if (!checklist) throw new Error(`no checklist for regulation area ${a.key}`);
  return { ...a, rubric: checklist.rubric };
});

export const STATES = (
  [
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],
    ["DC", "District of Columbia"],
  ] as const
).map(([code, name]) => ({ code, name }));
