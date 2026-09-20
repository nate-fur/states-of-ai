# Features

Work tracker for the StateAI Index. One line per item; move items between
sections as they progress. Details live in `docs/`, not here.

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## In progress

- [~] Bill Reader: per-area takeaways that highlight the provisions they cite (`src/components/bill/`, `src/lib/bill/`)
- [~] Classifier writes shortTitle, gist, and per-area summaries + takeaways (`convex/legiscan/classify.ts`)
- [~] Tier agent grades against per-area rubrics and records note + basis bills
- [~] `/data` page: chips and takeaways views

## Todo

- [ ] Decide the AI regulation score formula (0 to 6) from area tiers
- [ ] Decide the data center posture formula (-3 to +3) from tier + facilities
- [ ] Replace the "Scores use placeholder formulas" copy once the formulas land
- [ ] First full pipeline run against live LegiScan (check `apiUsage` before reclassifying; ~430 OpenAI calls)
- [ ] Rework takeaway generation for long bills. Quality degrades when a bill yields many takeaways; each bill's per-area takeaways should highlight the right sections and subsections in full and not skip sections that belong
- [ ] Better way to view takeaways that span many sections across a whole bill
- [ ] Stable regeneration: reclassifying a bill with the same system should not change its summary, gist, or takeaways. Users should never see a different set after a rerun. Approach unclear, likely tricky (pin model + temperature 0, seed, cache by textHash + prompt hash, or only regenerate when text changes)

## Ideas / later

- [ ]

## Done

- [x] Empty states in the dossier (no data centers, no operating capacity, no bills) and the diff's merged bill list
- [x] Map mode toggle (Combined / Compute / Regulation) with single-hue ramps, swapped legend, dossier coupling, and `?mode=` in the URL
- [x] Data model rebuilt and Convex seeded from scratch
- [x] LegiScan and Compute Atlas pipelines as Convex crons
- [x] Map wired to live Convex data with a seed/live toggle
- [x] Regulation categories renamed to regulation areas
