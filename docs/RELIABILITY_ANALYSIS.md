# Reliability analysis in Anklyze

How Anklyze measures agreement between raters and against a gold standard, what the code computes today, and how to run a validation study with it. The statistics are explained for readers who are not statisticians.

## Contents

1. [Why reliability matters](#1-why-reliability-matters)
2. [What is being rated](#2-what-is-being-rated)
3. [Statistical concepts](#3-statistical-concepts)
4. [What Anklyze computes](#4-what-anklyze-computes)
5. [Open issues](#5-open-issues)
6. [Validation protocol](#6-validation-protocol)
7. [Glossary](#7-glossary)

## 1. Why reliability matters

Reliability asks two questions about a classification:

- If the **same doctor** classifies the same fracture twice, do they get the same result?
- If **different doctors** classify the same fracture, do they agree?

Before the Anklyze algorithm can be trusted in clinical settings, three things have to be shown:

1. **The algorithm is correct.** It classifies fractures according to established medical standards.
2. **The algorithm is reliable.** Different users get the same results for the same case.
3. **The algorithm matches experts.** Results align with what experienced doctors would conclude.

Studies are the tool for the second and third. A study shows the same X-ray images to several doctors, collects their classifications, and compares them with each other and with a gold standard (the correct answer).

## 2. What is being rated

Raters answer a questionnaire that walks a decision tree. It starts with which malleoli are fractured and then asks only the questions that branch needs. The tree is rendered in [`decision_tree.txt`](decision_tree.txt) and, as one row per terminal path, in [`decision_table.txt`](decision_table.txt).

Each response is a classification in four systems. Agreement is computed separately for each.

| System | What it measures | Categories |
|--------|------------------|------------|
| **Danis-Weber** | Where the fibula is broken relative to the ankle joint | A (below), B (at), C (above) |
| **Lauge-Hansen** | How the injury happened (mechanism) | SA, SER, PA, PER |
| **AO/OTA** | Alphanumeric code | 44-A1, 44-A2, 44-B1, 44-B2, 44-B3, 44-C1, 44-C2, 44-C3 |
| **Bartonicek** | Posterior malleolus fragment type (requires CT scan) | Type 1, 2, 3, 4 |

The engine also returns AO/OTA subgroup codes (for example `44-B1.2`), `44-A3`, `43-B1`, `43-B2`, and "not classifiable" in every system. See `internal/domain/classification.go` for the full list.

## 3. Statistical concepts

### 3.1 Percentage agreement

The percentage of times two or more people gave the same answer.

```
Doctor A:  Weber A  |  Weber B  |  Weber B  |  Weber C  |  Weber B
Doctor B:  Weber A  |  Weber B  |  Weber A  |  Weber C  |  Weber B
           ────────────────────────────────────────────────────────
Match?       yes         yes         no          yes         yes

Agreement = 4 matches / 5 cases = 80%
```

This number can mislead. If 90% of ankle fractures are Weber B, two doctors could agree 81% of the time just by always guessing "Weber B", without looking at the X-ray.

### 3.2 Cohen's kappa (κ), for 2 raters

A statistic that measures agreement beyond what you would expect by random chance.

Two students guessing on a multiple-choice test with 3 choices (A, B, C) would match about 33% of the time by luck. Kappa asks how much better than chance the raters did.

```
Kappa = (Observed Agreement - Expected by Chance) / (Perfect Agreement - Expected by Chance)
```

Example:

```
Two doctors classified 100 fractures:

                    Doctor B
                    Weber A    Weber B    Weber C    Total
Doctor A  Weber A      20         5          0        25
          Weber B       3        55          2        60
          Weber C       0         2         13        15
          Total        23        62         15       100

Observed Agreement = (20 + 55 + 13) / 100 = 88%

Expected by Chance:
- P(both say A) = (25/100) × (23/100) = 5.75%
- P(both say B) = (60/100) × (62/100) = 37.2%
- P(both say C) = (15/100) × (15/100) = 2.25%
- Total expected = 5.75% + 37.2% + 2.25% = 45.2%

Kappa = (0.88 - 0.452) / (1 - 0.452) = 0.428 / 0.548 = 0.78
```

Interpreting kappa (Landis & Koch scale):

| Kappa value | Interpretation | What it means |
|-------------|----------------|---------------|
| < 0 | Poor | Worse than random chance (disagreement) |
| 0.00 - 0.20 | Slight | Barely better than guessing |
| 0.21 - 0.40 | Fair | Some agreement, but not great |
| 0.41 - 0.60 | Moderate | Reasonable agreement |
| 0.61 - 0.80 | Substantial | Good agreement |
| 0.81 - 1.00 | Almost Perfect | Excellent agreement |

Cohen's kappa only works for exactly 2 raters.

### 3.3 Fleiss' kappa, for multiple raters

An extension of Cohen's kappa for 3 or more raters. Instead of comparing pairs, it looks at how many raters agreed on each case.

```
5 doctors classified 4 fractures:

Case    Weber A    Weber B    Weber C    (5 doctors per case)
──────────────────────────────────────────
  1        5          0          0       ← Perfect agreement (all said A)
  2        0          4          1       ← Good agreement (4/5 said B)
  3        2          2          1       ← Poor agreement (split)
  4        1          3          1       ← Moderate agreement (3/5 said B)
```

The calculation:

1. For each case, calculate how much agreement there is
2. Average across all cases
3. Compare to what you'd expect by chance
4. Apply the same formula as Cohen's kappa

It needs several cases. With a single case there is nothing to average over.

### 3.4 Confidence intervals

A range that likely contains the "true" value.

A kappa of 0.78 is based on one sample. With different doctors it might have been 0.72 or 0.84. A 95% confidence interval (CI) gives a range, for example:

- Kappa = 0.78, 95% CI [0.65, 0.91]

This means: "We're 95% confident the true Kappa is somewhere between 0.65 and 0.91."

```
Result A: Kappa = 0.78, 95% CI [0.65, 0.91]
          └── Confident it's at least "substantial" agreement

Result B: Kappa = 0.78, 95% CI [0.35, 0.95]
          └── Could be anywhere from "fair" to "almost perfect" – not useful!
```

The width of the CI depends on sample size. More responses give a narrower CI.

### 3.5 Weighted kappa

A version of kappa that accounts for how wrong a disagreement is.

Regular kappa treats all disagreements equally:

- Doctor A says "Weber A", Doctor B says "Weber B" → 1 disagreement
- Doctor A says "Weber A", Doctor B says "Weber C" → 1 disagreement

Clinically, confusing A with B (adjacent categories) may be less serious than confusing A with C (opposite ends). Weighted kappa assigns weights to disagreements:

```
                    Doctor B
                    Weber A    Weber B    Weber C
Doctor A  Weber A      0         0.5        1.0
          Weber B     0.5        0          0.5
          Weber C     1.0        0.5        0

0 = agreement (no penalty)
0.5 = partial disagreement (half penalty)
1.0 = complete disagreement (full penalty)
```

In Anklyze this applies to AO/OTA, where 44-B1 and 44-B2 are "closer" than 44-B1 and 44-C3.

### 3.6 Sensitivity and specificity

Measures of how good a test is at detecting things. When comparing user responses to a gold standard:

```
                        Gold Standard
                        Weber A          Not Weber A
User Said    Weber A    True Positive    False Positive
             Not A      False Negative   True Negative
```

**Sensitivity** (true positive rate):

- Of all the cases that ARE Weber A, what percentage did we correctly identify?
- Formula: True Positives / (True Positives + False Negatives)

**Specificity** (true negative rate):

- Of all the cases that are NOT Weber A, what percentage did we correctly rule out?
- Formula: True Negatives / (True Negatives + False Positives)

Example:

```
100 cases: 30 are Weber A (gold standard), 70 are not Weber A

Users classified:
- 25 of the 30 Weber A cases correctly (True Positives)
- 5 of the 30 Weber A cases as something else (False Negatives)
- 65 of the 70 non-Weber A cases correctly (True Negatives)
- 5 of the 70 non-Weber A cases as Weber A (False Positives)

Sensitivity = 25 / (25 + 5) = 83.3%  "Catches 83% of Weber A cases"
Specificity = 65 / (65 + 5) = 92.9%  "Correctly rules out 93% of non-Weber A cases"
```

### 3.7 Confusion matrix

A table showing how classifications compare between predicted and actual (or between two raters).

```
Gold Standard vs. User Responses for Lauge-Hansen:

              Predicted by Users
              SA      SER     PA      PER     Total
Actual  SA    45       3       2       0        50
Gold    SER    2      78       5       5        90
Std     PA     1       4      35       0        40
        PER    0       3       1      16        20
        ───────────────────────────────────────────
        Total 48      88      43      21       200
```

Reading the matrix:

- Diagonal (45, 78, 35, 16) = correct classifications
- Off-diagonal = errors
- Row totals = actual counts by gold standard
- Column totals = predicted counts by users

What it reveals:

- SER has the most confusion (some mistaken for PA and PER)
- SA is rarely confused with PER (anatomically they're very different)
- Users tend to over-predict SER (88 predicted vs. 90 actual)

## 4. What Anklyze computes

The calculations are in `internal/statistics/`. `internal/service/statistics.go` and `internal/service/gold_standard.go` decide which ones run and on what data. A user can submit one response per case.

### 4.1 Per study

A study is a set of cases that the same raters classify. Endpoints: `GET /api/admin/studies/:id/reliability` and `GET /api/admin/studies/:id/accuracy`.

A "complete rater" is a rater who responded to every case in the study. Kappa statistics use complete raters only.

| Metric | How it is computed | Code |
|--------|--------------------|------|
| Fleiss' kappa, per system | Over the complete raters; needs at least 2. For each system, a case is used only if every complete rater gave an answer in that system. A case where any of them gave none is left out of that system and counted in `num_cases_excluded`. A system needs at least 2 usable cases, otherwise no result. | `fleiss_kappa.go`, `internal/service/statistics.go` |
| 95% CI for Fleiss' kappa | Percentile bootstrap over cases. The usable cases are resampled with replacement 2000 times with a fixed seed, Fleiss' kappa is computed on each resample, and the interval is the 2.5th and 97.5th percentile of those kappas. Resamples with every rating in one category have no kappa and are skipped. With m usable resamples, the bounds are the sorted values at positions `round(0.025·m)` and `m−1−round(0.025·m)`, counting from 0. Bounds clamped to [-1, 1]. No interval if no resample is usable. | `fleiss_kappa.go` |
| Cohen's kappa, per system | Only when exactly 2 complete raters. Computed across the cases both raters answered in that system, one pair of ratings per case; needs at least 2 such cases. | `cohens_kappa.go`, `internal/service/statistics.go` |
| 95% CI for Cohen's kappa | Same percentile bootstrap as Fleiss' kappa, over the case pairs: resampled with replacement 2000 times with a fixed seed, Cohen's kappa computed on each resample, interval from the 2.5th and 97.5th percentile with the same position rule. Resamples with every rating in one category have no kappa and are skipped. Bounds clamped to [-1, 1]. No interval with fewer than 2 pairs or when every rating is in one category. | `cohens_kappa.go`, `bootstrap.go` |
| AO/OTA weighted kappa | Only when exactly 2 complete raters. Linear weights over the AO/OTA ordering below, on the same case pairs. A subgroup code is first replaced by its group (`44-B1.2` becomes `44-B1`). A pair with a code still outside the ordering is excluded and counted in `num_pairs_excluded`. Needs at least 2 pairs left. No interval. | `weighted_kappa.go`, `internal/service/statistics.go` |
| Interpretation label | Landis & Koch scale from section 3.2 | `internal/domain/reliability.go` |
| Per-case agreement, per system | Share of responses that gave the most common answer for that case | `percent_agreement.go` |
| Low-agreement flag | Per-case agreement below 60% in Danis-Weber, Lauge-Hansen or AO/OTA | `internal/service/statistics.go` |
| Gold standard accuracy, per system | Per case: percentage of responses equal to the gold standard. Per study: mean across cases that have a gold standard. | `gold_standard.go` |
| Consensus rate | How often the most common answer for a case equals the gold standard | `gold_standard.go` |
| Hard-case flag | Accuracy below 50% in any system | `internal/service/gold_standard.go` |
| Per-rater accuracy | Each rater's accuracy across cases with a gold standard | `internal/service/gold_standard.go` |

Study results are cached for 5 minutes and invalidated when a response is submitted.

Example `FleissKappaResult`:

```json
{
  "kappa": 0.72,
  "interpretation": "substantial",
  "num_raters": 5,
  "num_subjects": 10,
  "num_categories": 3,
  "num_cases_excluded": 0,
  "confidence_interval": {
    "lower": 0.58,
    "upper": 0.86,
    "level": 0.95
  }
}
```

Example `CohensKappaResult` for AO/OTA, from a study with two complete raters:

```json
{
  "kappa": 0.4,
  "interpretation": "fair",
  "num_subjects": 8,
  "num_cases_excluded": 2,
  "confidence_interval": {
    "lower": -0.2,
    "upper": 1,
    "level": 0.95
  },
  "weighted_kappa": {
    "kappa": 0.47,
    "type": "linear",
    "num_pairs": 6,
    "num_pairs_excluded": 2
  }
}
```

The fields are `danis_weber_cohen`, `lauge_hansen_cohen`, `ao_ota_cohen` and `bartonicek_cohen`, next to the matching `*_fleiss` fields. They are absent unless exactly two raters completed the study. `weighted_kappa` appears on `ao_ota_cohen` only.

Weighted kappa weights:

- Linear: `w_ij = 1 - |i-j|/(k-1)`
- Quadratic: `w_ij = 1 - (i-j)²/(k-1)²`

These are agreement weights (1 on the diagonal), the complement of the penalty table in section 3.5. The service uses linear weights. The AO/OTA ordering is:

```go
var AOOTAOrdering = []string{
    "44-A1", "44-A2", "44-A3",
    "44-B1", "44-B2", "44-B3",
    "44-C1", "44-C2", "44-C3",
}
```

### 4.2 Per case

Endpoints: `GET /api/admin/cases/:id/reliability` and `GET /api/admin/cases/:id/accuracy`.

| Metric | How it is computed | Code |
|--------|--------------------|------|
| Percent agreement | Share of responses that gave the most common answer, per system. It needs at least 2 classified responses; with fewer, `percent_agreement` is null (one rating has nothing to agree with). | `percent_agreement.go` |
| Category counts | Responses per category | `category_metrics.go` |
| Gold standard accuracy | Percentage of responses equal to the gold standard, plus the most common answer and the response distribution | `gold_standard.go` |

No kappa is computed for a single case. One case gives each rater one rating, so Cohen's kappa could only be 1 (they agree) or 0 (they do not), and Fleiss' kappa needs several cases. Kappa is reported per study, section 4.1.

Example fields on a per-system result:

```json
{
  "system": "ao_ota",
  "percent_agreement": 66.7,
  "category_counts": { "44-B1": 2, "44-B2": 1 }
}
```

### 4.3 Where the code differs from section 3

Read these before citing a number the app produced.

- **Percent agreement** is the share of responses matching the most common answer for one case. It is not the pairwise match rate across cases shown in section 3.1. The interface labels it "Agreement with the most common answer".
- **Kappa is per study, never per case.** The per-case page shows percent agreement and category counts only.
- **Cohen's kappa appears only with exactly two complete raters.** With three or more, Fleiss' kappa is the only kappa. With exactly two, both are shown. They differ a little because Fleiss' kappa pools the two raters' category frequencies and Cohen's kappa keeps each rater's own.
- **Cases without an answer are dropped per system.** Fleiss' kappa needs the same number of ratings for every case. When a complete rater gave no answer in a system (for example no Bartonicek type), that case is left out of that system and the other raters keep all their data. Dropping the rater instead would discard that rater's answers on every other case, and would leave no raters at all when a case has no answer from anyone. The cost is that a system's kappa describes only the cases every complete rater answered, which may be easier cases. Compare `num_subjects` with the study's total cases and report `num_cases_excluded` with the figure. Before this change the empty answer was counted as a missing rating for that case, which distorted kappa.
- **Weighted kappa compares AO/OTA groups.** `44-B1.2` counts as `44-B1`. Codes outside the ordering are excluded and counted: `44-B` (subtype not classifiable), `43-B1`, `43-B2` and "not classifiable". The count is `num_pairs_excluded`. Report it with the figure.
- **Both kappa intervals are bootstrap intervals over cases.** Earlier versions used a normal approximation for Cohen's kappa, which had zero width when raters agreed on every case or on none; Cohen intervals from those versions are not comparable. When raters agree on every case the bootstrap interval is still [1, 1], because every usable resample is perfect. With few cases the interval is coarse, so read it together with `num_subjects`.
- **Kappa with a single category.** If every rating in a system falls in one category, kappa is 0/0. The result is returned with a null `kappa`, no interval and `kappa_unavailable_reason: "no_variation"`, for Fleiss and Cohen alike (and no AO/OTA weighted kappa). Earlier versions reported 1. Perfect agreement on cases that differ is a real kappa of 1.
- **At least 2 usable cases are needed.** With fewer, no Fleiss or Cohen result is returned for that system.
- **Duplicate responses.** The app accepts one response per rater and case. If the database holds more, study kappas use the latest, while per-case percent agreement counts every response.
- **Sensitivity, specificity, PPV, NPV and F1 are not computed**, and neither is a confusion matrix. Section 3 explains the concepts; the app does not produce them. The CSV export is the source for computing them outside the app.

## 5. Open issues

### No algorithm versioning

Responses do not record which version of the decision tree produced them.

1. January: run study with algorithm v1.0, get Kappa = 0.75
2. March: update algorithm to fix an edge case
3. June: run new study, get Kappa = 0.82
4. Is the improvement due to the fix or to different users and cases?

Without a version on each result, that question cannot be answered and historical data cannot be reprocessed with a new algorithm. A fix would store a version and a hash of the tree with every classification result.

### No expertise stratification

Years of experience, specialty, training level and institution are collected on user profiles and included in the per-case detailed CSV export, but the analytics do not break results down by them. Questions this would answer:

- Do attending physicians agree more than residents?
- Does experience correlate with gold standard accuracy?
- Which specialties have highest agreement?

### No time-based analysis

Time taken per response and per question is stored but not analysed. Questions this would answer:

- Do faster responses correlate with accuracy?
- Do experts classify faster?
- Which responses were rushed?

### No decision-path divergence analysis

Each response stores the rater's answer path through the questionnaire (`answer_path`, `decision_path`). The gold standard stores only the final classification, so the app cannot yet show at which question a rater left the gold standard's path:

```
Gold Standard: Weber B, SER, 44-B2
User Answer:   Weber B, PA, 44-B2

The questionnaire path:
1. Which malleoli? → Lateral + Medial (same)
2. Fibular level? → Transindesmal (same)
3. Lateral morphology? → They said "Oblique" (should be "Spiral")
                         ↓
                    This is where PA comes from instead of SER
```

### No rater assignment

Any signed-in user can respond to a published case. A study has no fixed rater panel, so "complete raters" are whoever happened to answer every case.

### ICC

The intraclass correlation coefficient is not planned. It does not apply to categorical classification data; kappa and weighted kappa cover these cases.

## 6. Validation protocol

### 6.1 What can be validated

| Aspect | Method | Metric |
|--------|--------|--------|
| **Inter-rater reliability** | Multiple doctors classify same cases | Fleiss' Kappa |
| **Gold standard accuracy** | Compare user classifications to expert consensus | Match rate % |
| **Questionnaire clarity** | Identify cases with high disagreement | Per-case agreement |
| **System-specific reliability** | Separate Kappa for each classification system | Per-system Kappa |

### 6.2 Workflow

```text
1. PREPARATION
   ├── Select 30+ representative X-ray cases
   │   ├── Include variety: Weber A/B/C, different mechanisms
   │   ├── Mix of clear and challenging cases
   │   └── Multiple views (AP, lateral, mortise) when available
   ├── Gold Standard Determination
   │   ├── Have 2-3 senior experts independently classify each case
   │   ├── Resolve disagreements through consensus discussion
   │   └── Document rationale for each gold standard
   └── Prepare high-quality digital images

2. SETUP IN ANKLYZE
   ├── Create individual cases (one per patient)
   │   ├── Upload X-ray images
   │   ├── Set the gold standard
   │   └── Keep as draft initially
   ├── Create the study
   │   └── Title: "Algorithm Validation Study [Year]"
   ├── Add all cases to the study (reorder as needed)
   ├── Recruit raters
   │   ├── Minimum: 4 raters
   │   ├── Recommended: 6+ raters
   │   └── Mix of experience levels (attendings, fellows, residents)
   └── Publish the cases and activate the study when ready

3. DATA COLLECTION
   ├── Raters access published cases
   ├── Each rater classifies ALL cases independently
   ├── No time limit, but time taken per case is recorded
   └── Wait until all raters complete all cases

4. ANALYSIS
   ├── Open the study reliability page
   ├── Review metrics:
   │   ├── Fleiss' Kappa per system (with 95% CI)
   │   ├── Overall gold standard match rate
   │   ├── Per-case agreement breakdown
   │   └── Hard case identification
   └── Export CSV for external statistical analysis (SPSS, R, etc.)
```

### 6.3 Sample size

For publication-ready validation:

| Parameter | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Cases** | 30 | 50+ | Include variety of fracture types |
| **Raters** | 4 | 6+ | Mix of expertise levels |
| **Completion** | 100% | 100% | All raters must complete ALL cases |

### 6.4 Interpreting results

| Fleiss' Kappa | Interpretation | Action |
|---------------|----------------|--------|
| κ > 0.80 | Almost perfect | Algorithm validated |
| 0.61 - 0.80 | Substantial | Good reliability, review outlier cases |
| 0.41 - 0.60 | Moderate | Investigate confusion patterns |
| 0.21 - 0.40 | Fair | Questionnaire may need revision |
| < 0.21 | Slight/Poor | Significant issues to address |

Result patterns:

| Pattern | Meaning | Action |
|---------|---------|--------|
| High Kappa + High Gold Match | Algorithm and questionnaire work well | Ready for clinical use |
| High Kappa + Low Gold Match | Raters agree but on wrong answers | Training issue or ambiguous images |
| Low Kappa + High Gold Match | Random variation cancels out | Raters unreliable, need better instructions |
| Low Kappa + Low Gold Match | Questionnaire confusing or images inadequate | Review questions, improve image quality |

### 6.5 What to report

From the app:

- Fleiss' Kappa with 95% confidence intervals, per system, with the number of cases excluded
- With exactly two complete raters: Cohen's Kappa with its interval, and AO/OTA weighted kappa with the number of excluded pairs
- Percent agreement per case and per system
- Gold standard accuracy per system, per case and per rater

From the CSV export, with external tools: sensitivity and specificity per category, PPV, NPV, F1 and confusion matrices. The app does not compute them; see section 4.3.

### 6.6 Checklist

Before concluding a validation study, verify:

- [ ] All raters completed ALL cases (100% completion required for Fleiss' Kappa)
- [ ] Gold standard was set by independent expert consensus
- [ ] Sample includes representative variety of fracture types
- [ ] At least 30 cases evaluated
- [ ] At least 4 raters participated
- [ ] Fleiss' Kappa calculated for each classification system
- [ ] Confidence intervals reported
- [ ] Hard cases reviewed and documented
- [ ] CSV data exported for independent verification

## 7. Glossary

| Term | Definition |
|------|------------|
| **Agreement** | The degree to which two or more raters give the same classification |
| **AO/OTA** | Arbeitsgemeinschaft für Osteosynthesefragen / Orthopaedic Trauma Association - a comprehensive fracture classification system |
| **Bartonicek** | Classification system specifically for posterior malleolus fractures |
| **Case** | In Anklyze, one patient's X-ray images that raters classify |
| **Cohen's Kappa** | A statistic measuring agreement between two raters, adjusted for chance |
| **Confidence Interval** | A range of values that likely contains the true population parameter |
| **Confusion Matrix** | A table showing the relationship between actual and predicted classifications |
| **Danis-Weber** | Classification based on fibula fracture location relative to syndesmosis |
| **Fleiss' Kappa** | Extension of Cohen's Kappa for three or more raters |
| **Gold Standard** | The "correct" answer, typically determined by expert consensus or surgical confirmation |
| **Inter-rater Reliability** | Consistency of ratings between different raters |
| **Intra-rater Reliability** | Consistency of ratings by the same rater over time |
| **Kappa** | A statistical measure of inter-rater agreement adjusted for chance |
| **Lauge-Hansen** | Classification based on injury mechanism (foot position and force direction) |
| **Nominal Data** | Categories with no inherent order (e.g., Weber A, B, C) |
| **Ordinal Data** | Categories with a natural order (e.g., 1st, 2nd, 3rd) |
| **Rater** | A person who provides classifications (doctor, user) |
| **Sensitivity** | Ability to correctly identify positive cases |
| **Specificity** | Ability to correctly identify negative cases |
| **Study** | In Anklyze, a group of cases classified by the same raters for reliability analysis |
| **Subject** | In reliability studies, the item being rated (a case/patient) |
| **Weighted Kappa** | Kappa that accounts for the degree of disagreement |
