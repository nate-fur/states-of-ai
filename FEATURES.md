# Features

Work tracker for the StateAI Index. One line per item; move items between
sections as they progress. Details live in `docs/`, not here.

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## In progress

- [~] Classifier writes shortTitle, gist, and per-area summaries + takeaways (`convex/legiscan/classify.ts`)
- [~] Tier agent grades against per-area rubrics and records note + basis bills
- [~] `/data` page: chips and takeaways views

## Todo

- [ ] Run `retier` so every grade carries checklist elements (one OpenAI call per state-area with an enacted bill; check `apiUsage` first)
- [ ] Recalibrate scoring cut points after the first full LegiScan run (`node scripts/check-scoring.mts`, docs/scoring.md "Recalibration")
- [ ] First full pipeline run against live LegiScan (check `apiUsage` before reclassifying; ~430 OpenAI calls)
- [ ] Rework takeaway generation for all bills. Highlighted sections are sometimes irrelevant, miss nearby subsections that belong, or otherwise don't read as expert-curated by a human; each bill's per-area takeaways should cite the right sections and subsections in full
- [ ] Stable regeneration: reclassifying a bill with the same system should not change its summary, gist, or takeaways. Users should never see a different set after a rerun. Approach unclear, likely tricky (pin model + temperature 0, seed, cache by textHash + prompt hash, or only regenerate when text changes)

## Ideas / later

- [ ]

## Done

- [x] Scoring system: per-area element checklists graded by the tier agent, tier by rule, regulation score as a banded sum, build-out score from operating capacity plus pipeline (`src/lib/scoring/`, docs/scoring.md)
- [x] `/scoring` page explaining the method from the same constants; axis copy changed from posture/restrict/accelerate to build-out
- [x] Parser: wrapped cross-references (`Section 541.001, …`) no longer parse as headings and reparent the subdivisions after them; `§ 59.1-200 .` headings parse
- [x] Bill Reader: per-area takeaways that highlight the provisions they cite (`src/components/bill/`, `src/lib/bill/`)
- [x] Bill Reader folds the text around a selected takeaway: one window per cluster of cited lines, fold bars for everything between, sticky banner with the place count
- [x] Empty states in the dossier (no data centers, no operating capacity, no bills) and the diff's merged bill list
- [x] Map mode toggle (Combined / Compute / Regulation) with single-hue ramps, swapped legend, dossier coupling, and `?mode=` in the URL
- [x] Data model rebuilt and Convex seeded from scratch
- [x] LegiScan and Compute Atlas pipelines as Convex crons
- [x] Map wired to live Convex data with a seed/live toggle
- [x] Regulation categories renamed to regulation areas
