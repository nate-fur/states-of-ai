# Features

Work tracker for the StateAI Index. One line per item; move items between
sections as they progress. Details live in `docs/`, not here.

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## In progress

- [~] Classifier writes shortTitle, gist, and per-area summaries + takeaways (`convex/legiscan/classify.ts`)
- [~] Tier agent grades against per-area rubrics and records note + basis bills
- [~] `/data` page: chips and takeaways views

## Todo

- [ ] Bring regulation-area rubric information into the UI from the Claude Design: show each area's five tier lines and mark the state's tier
- [ ] Decide the AI regulation score formula (0 to 6) after the full bill run; current grades cover a subset, so the distribution can still move
- [ ] Decide the data center posture formula (-3 to +3) from tier + facilities
- [ ] First full pipeline run against live LegiScan (check `apiUsage` before reclassifying; ~430 OpenAI calls)
- [ ] Rework takeaway generation for all bills. Highlighted sections are sometimes irrelevant, miss nearby subsections that belong, or otherwise don't read as expert-curated by a human; each bill's per-area takeaways should cite the right sections and subsections in full
- [ ] Stable regeneration: reclassifying a bill with the same system should not change its summary, gist, or takeaways. Users should never see a different set after a rerun. Approach unclear, likely tricky (pin model + temperature 0, seed, cache by textHash + prompt hash, or only regenerate when text changes)

## Ideas / later

- [ ]

## Done

- [x] Dropped the "Scores use placeholder formulas" caption and the "Placeholder formula" score summaries
- [x] Parser: wrapped cross-references (`Section 541.001, …`) no longer parse as headings and reparent the subdivisions after them; `§ 59.1-200 .` headings parse
- [x] Bill Reader: per-area takeaways that highlight the provisions they cite (`src/components/bill/`, `src/lib/bill/`)
- [x] Bill Reader folds the text around a selected takeaway: one window per cluster of cited lines, fold bars for everything between, sticky banner with the place count
- [x] Empty states in the dossier (no data centers, no operating capacity, no bills) and the diff's merged bill list
- [x] Map mode toggle (Combined / Compute / Regulation) with single-hue ramps, swapped legend, dossier coupling, and `?mode=` in the URL
- [x] Combined map colored by a net-stance diverging ramp (amber build-forward → indigo regulation-forward) sharing the two axis hues; quadrant colors dropped, the dossier/diff square is the same ramp on the diagonal
- [x] Data model rebuilt and Convex seeded from scratch
- [x] LegiScan and Compute Atlas pipelines as Convex crons
- [x] Map wired to live Convex data with a seed/live toggle
- [x] Regulation categories renamed to regulation areas
