# Features

Work tracker for the StateAI Index. One line per item; move items between
sections as they progress. Details live in `docs/`, not here.

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## In progress

- [~] Writer (generative model) writes shortTitle, gist, and per-area summaries + takeaways for the areas Jev tagged (`convex/legiscan/describe.ts`)
- [~] Tier agent grades against per-area rubrics on Jev and records confidence, note, and basis bills
- [~] `/data` page: chips and takeaways views

## Todo

- [ ] Bring regulation-area rubric information into the UI from the Claude Design: show each area's five tier lines and mark the state's tier
- [ ] Decide the AI regulation score formula (0 to 6) after the full bill run; current grades cover a subset, so the distribution can still move
- [ ] Decide the data center posture formula (-3 to +3) from tier + facilities
- [ ] Rubrics that Jev grades flatly: the deepfakes ladder mixes subjects (political ads, election bans, intimate imagery, criminal penalties), so an identity-fraud deepfake act gets a flat distribution; check low-confidence grades after a retier
- [ ] Area definitions Jev reads narrowly: "Chatbots & minors" leaves a general chatbot liability act at ~0.4; bills about AI that fit no area (Right to Compute acts, algorithmic rent pricing, AI literacy) are remembered as skips
- [ ] Proposed bills: the pipeline stops saving introduced-only bills as of 2026-09-21 (dropped after `getBill`; the skip expires when the bill advances). About 900 saved before then are left in place as context; decide whether to delete them or hide them by default in the rail
- [ ] `recite` step: re-pick each takeaway's sectionIds from the stored text without rewriting the prose (a selection problem: Jev noul per provision and claim, or a schema with only sectionIds), plus code rules for pulling in adjacent subsections. Today only `redescribe` touches highlights and it regenerates all prose
- [ ] Follow-ups from the first full run: cap chunking on omnibus bills (100-300 part budget bills burned most of the Jev budget and are never about AI as a whole), a PDF over the Node action's 512 MB memory, and `apiUsage.reserve` write conflicts under ~20 concurrent chains
- [ ] Rework takeaway generation for all bills. Highlighted sections are sometimes irrelevant, miss nearby subsections that belong, or otherwise don't read as expert-curated by a human; each bill's per-area takeaways should cite the right sections and subsections in full
- [ ] Stable regeneration: reclassifying a bill with the same system should not change its summary, gist, or takeaways. Users should never see a different set after a rerun. Approach unclear, likely tricky (pin model + temperature 0, seed, cache by textHash + prompt hash, or only regenerate when text changes)

## Ideas / later

- [ ]

## Done

- [x] First full pipeline run against live LegiScan; TypeSafe 5xx now retried and its 402 billing error stops a batch
- [x] Dropped the "Scores use placeholder formulas" caption and the "Placeholder formula" score summaries
- [x] Parser: wrapped cross-references (`Section 541.001, …`) no longer parse as headings and reparent the subdivisions after them; `§ 59.1-200 .` headings parse
- [x] Bill Reader: per-area takeaways that highlight the provisions they cite (`src/components/bill/`, `src/lib/bill/`)
- [x] Bill Reader folds the text around a selected takeaway: one window per cluster of cited lines, fold bars for everything between, sticky banner with the place count
- [x] Empty states in the dossier (no data centers, no operating capacity, no bills) and the diff's merged bill list
- [x] Map mode toggle (Combined / Compute / Regulation) with single-hue ramps, swapped legend, dossier coupling, and `?mode=` in the URL
- [x] Combined map colored by a net-stance diverging ramp (amber build-forward → indigo regulation-forward) sharing the two axis hues; quadrant colors dropped, the dossier/diff square is the same ramp on the diagonal
- [x] Data model rebuilt and Convex seeded from scratch
- [x] Classifier and tier agent moved to Jev (TypeSafe System One): typed probabilities instead of generated JSON, ~1000x cheaper, sub-second; prose stays with the generative model. `reclassify` / `redescribe` / `retier` reruns and `scripts/check-jev-*.mts` comparisons
- [x] LegiScan and Compute Atlas pipelines as Convex crons
- [x] Map wired to live Convex data with a seed/live toggle
- [x] Regulation categories renamed to regulation areas
