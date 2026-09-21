# Scoring

How each state's two scores are computed. The code is `src/lib/scoring/`
(`checklists.ts` for what counts, `formulas.ts` for the arithmetic) and the
public explanation is the `/scoring` page, which renders from the same
constants. This file is the design rationale.

## Principles

- **Derived, never hand-set.** Both scores are plain functions of rows in
  Convex (grades and facilities). No agent picks a score.
- **Enacted law only.** Pending and proposed bills are shown as context but
  never move a tier or a score.
- **Fixed, published cut points.** Thresholds are absolute, so a state's
  score changes only when its own facts change. They were calibrated in
  September 2026 against the live data and should be revisited yearly (see
  "Recalibration").
- **Transparent grading.** The one place a model exercises judgment is
  deciding whether an enacted bill contains a specific provision. It never
  chooses a number.
- **Independent axes.** The "DC energy & water" regulation area feeds the
  regulation score like any other area. The build-out score comes from
  facilities alone. The quadrant is the pair.

## AI regulation (0 to 6)

### Step 1: element checklist per area

Each of the nine regulation areas has a fixed checklist of seven or eight
provisions ("elements"), each sitting on a rung from 1 to 4. Rung 1 is a
first, narrow duty (a disclosure, a study); rung 4 is what completes a
regime (enforcement, audits, a private right of action). The full lists are
in `src/lib/scoring/checklists.ts`.

The tier agent (`convex/legiscan/tier.ts`) is given the state's bills in the
area, with their per-area summaries and takeaways, and the checklist. For
each element it answers: does an *enacted* bill clearly contain this
provision, and which one? It also writes the one-sentence note the dossier
shows. It is told to be strict and to leave doubtful elements unchecked.
Areas with no enacted bill are graded 0 without a model call.

The grade row stores the element ids (`elements`) alongside `tier`, `note`,
and `basisBillIds`, so the `/scoring` page can count how many states have
each provision and the dossier can later list them.

### Step 2: tier by rule

```
tier = min(highest rung among met elements, number of met elements, 4)
```

A tier of N needs at least N provisions, one of which reaches rung N.
Depth needs breadth: a lone private right of action is tier 1; Colorado's
SB 205 regime (high-risk definition, impact assessments, developer duty of
care, consumer rights, AG enforcement) is tier 4.

Why not let the model pick the tier: two runs over the same bills disagreed
by a tier often enough to make the map flicker, and a holistic number
cannot be explained to a reader. A checklist can.

### Step 3: points

```
points = Σ tier over the nine areas        (0 to 36)
```

Areas are weighted equally. The checklists already set the bar per area, so
a tier-3 in deepfakes and a tier-3 in frontier duties each mean "three
provisions, one at rung 3". Weighting is the obvious knob to revisit if
deepfake laws (which nearly every state has) come to dominate the middle of
the distribution.

### Step 4: band

| Score | Band          | Points |
| ----- | ------------- | ------ |
| 0     | None          | 0      |
| 1     | Minimal       | 1–3    |
| 2     | Emerging      | 4–7    |
| 3     | Developing    | 8–12   |
| 4     | Established   | 13–18  |
| 5     | Extensive     | 19–25  |
| 6     | Comprehensive | 26+    |

The bands widen as they go up (3, 4, 5, 6, 7 points) so the low end, where
most states sit, is finely resolved, and 6 is reachable at roughly "Strong
in every area" (27 points) rather than requiring the theoretical maximum.
Any enacted provision anywhere lifts a state off 0, which matches the
legend's "0 = nothing enacted".

Expected placement once the full LegiScan run lands (rough, from public
knowledge of enacted law): California 6, Colorado and Texas 4, New York 3
to 4, Utah 3, the typical state with deepfake and health laws 2, states
with a single deepfake law 1.

## Data center build-out (−3 to +3)

Inputs are the `facilities` rows for the state: status (operational, under
construction, proposed) and `capacityMw` (null when undisclosed).

### Step 1: estimate capacity

Reported megawatts are summed per status. Undisclosed sites are imputed at
a deliberately low figure rather than counted as zero:

| Status             | Imputed MW | Why                                            |
| ------------------ | ---------- | ---------------------------------------------- |
| operational        | 10         | median disclosed operating site is 10 MW       |
| under construction | 100        | median disclosed is 300 MW; announcements run large |
| proposed           | 100        | median disclosed is 360 MW; most never build   |

About 56% of Compute Atlas sites have no figure, so imputation matters. It
mostly separates states with many undisclosed operating sites (Virginia,
Texas) from states with a few disclosed ones.

### Step 2: base from operating capacity

| Estimated operating MW | Base |
| ---------------------- | ---- |
| under 25               | −3   |
| 25–99                  | −2   |
| 100–249                | −1   |
| 250–599                | 0    |
| 600–999                | +1   |
| 1,000 and up           | +2   |

Roughly half-decade steps on a log scale, since the distribution is
heavy-tailed.

### Step 3: momentum from the pipeline

```
pipeline = 0.5 × under-construction MW + 0.2 × proposed MW   (both imputed)
```

| Weighted pipeline MW | Adds |
| -------------------- | ---- |
| under 500            | +0   |
| 500–4,999            | +1   |
| 5,000 and up         | +2   |

### Step 4: cap

```
score = min(3, base + momentum)
```

| Score | Band        |
| ----- | ----------- |
| −3    | Negligible  |
| −2    | Minimal     |
| −1    | Emerging    |
| 0     | Established |
| +1    | Major       |
| +2    | Leading     |
| +3    | Hyperscale  |

Distribution against the Compute Atlas snapshot of 2026-09-17 (51
jurisdictions): −3: 8, −2: 9, −1: 9, 0: 11, +1: 4, +2: 6, +3: 4 (Virginia,
Texas, Oregon, California). `node scripts/check-scoring.mts` reprints this.

The axis used to be labelled "posture, restrict to accelerate". It now
measures footprint, and the copy says build-out. The schema field is still
`dataCenterPosture` to avoid churn.

## Copy the scores produce

- `aiRegulation.summary`: "Established: 14 of 36 points across 6 of 9
  areas, strongest in Deepfakes & elections (Strong)."
- `dataCenterPosture.summary`: "Major: about 1.2 GW operating across 51
  sites, 17.0 GW announced or under construction at 78 more (86 sites
  undisclosed, imputed)."
- Dossier tagline (`tagline()` in `formulas.ts`): "Major build-out,
  established AI rules".
- Both axes also store `points` (regulation points; imputed operating MW).

## Recalibration

Revisit the cut points once a year, or when either distribution collapses
into two or three bands. Run `node scripts/check-scoring.mts` (local
Compute Atlas snapshot plus, with `NEXT_PUBLIC_CONVEX_URL` set, live
grades) to see the histograms. Changing a constant in `formulas.ts` and
running `scores:recomputeAll` rescores every state with no API calls.
Changing a checklist needs `seed:areas` (to update the rubric text) and
`retier` (one OpenAI call per state-area with enacted bills).
