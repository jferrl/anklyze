# Anklyze Reliability Analysis Guide

> A comprehensive guide to understanding the reliability assessment of the ankle fracture classification algorithm, written for non-statisticians.

## Table of Contents

1. [What is Reliability and Why Does It Matter?](#1-what-is-reliability-and-why-does-it-matter)
2. [The Classification Algorithm](#2-the-classification-algorithm)
3. [Statistical Concepts Explained](#3-statistical-concepts-explained)
4. [Current Implementation Analysis](#4-current-implementation-analysis)
5. [Identified Pain Points](#5-identified-pain-points)
6. [Recommendations](#6-recommendations)
7. [Algorithm Validation Protocol](#7-algorithm-validation-protocol)
8. [Glossary](#8-glossary)

---

## 1. What is Reliability and Why Does It Matter?

### The Big Picture

Imagine you create a recipe for chocolate chip cookies. You want to know:
- If **you** make the cookies twice, do they taste the same? (consistency)
- If **your friend** follows the same recipe, do their cookies taste the same as yours? (reproducibility)

In medical classification, reliability answers similar questions:
- If the **same doctor** classifies the same fracture twice, do they get the same result?
- If **different doctors** classify the same fracture, do they agree?

### Why This Matters for Anklyze

Anklyze helps classify ankle fractures using a decision-tree algorithm. Before this tool can be trusted in clinical settings, we need to prove:

1. **The algorithm is correct** → It classifies fractures according to established medical standards
2. **The algorithm is reliable** → Different users get the same results for the same case
3. **The algorithm matches experts** → Results align with what experienced doctors would conclude

### The Survey Feature's Role

The survey (study) feature allows us to:
- Show the same X-ray images to multiple doctors
- Collect their classifications
- Compare results to find agreement/disagreement patterns
- Compare results against a "gold standard" (the correct answer)

---

## 2. The Classification Algorithm

### How It Works

The algorithm is like a flowchart that asks questions and follows branches based on answers:

```
START: Which bones are fractured?
       │
       ├─► Posterior only ──────────► SER mechanism, AO/OTA B3
       │
       ├─► Medial only ─────────────► What's the fracture shape?
       │                                    │
       │                                    ├─► Oblique → SA mechanism
       │                                    └─► Transverse → Ambiguous (could be PA, SER, or PER)
       │
       ├─► Lateral only ────────────► Where on the fibula?
       │                                    │
       │                                    ├─► Below syndesmosis (infrasindesmal) → Weber A, SA
       │                                    ├─► At syndesmosis (transindesmal) → Weber B, then check shape...
       │                                    └─► Above syndesmosis (suprasindesmal) → Weber C, then check type...
       │
       └─► ... (continues for all 7 combinations)
```

### The Four Classification Systems

The algorithm outputs classifications in four different systems:

| System | What It Measures | Categories |
|--------|------------------|------------|
| **Danis-Weber** | Where the fibula is broken relative to the ankle joint | A (below), B (at), C (above) |
| **Lauge-Hansen** | How the injury happened (mechanism) | SA, SER, PA, PER |
| **AO/OTA** | Comprehensive alphanumeric code | 44-A1, 44-A2, 44-B1, 44-B2, 44-B3, 44-C1, 44-C2, 44-C3 |
| **Bartonicek** | Posterior malleolus fragment type (requires CT scan) | Type 1, 2, 3, 4 |

### Current Algorithm Strengths

✅ Covers all 7 possible malleoli combinations
✅ Identifies "impossible" anatomical combinations
✅ Marks ambiguous cases where multiple mechanisms are possible
✅ Has extensive test coverage (~1000 lines of tests)
✅ Supports English and Spanish

---

## 3. Statistical Concepts Explained

### 3.1 Agreement vs. Reliability

#### Simple Agreement (Percentage Agreement)

**What it is:** The percentage of times two or more people gave the same answer.

**Example:**
```
Doctor A:  Weber A  |  Weber B  |  Weber B  |  Weber C  |  Weber B
Doctor B:  Weber A  |  Weber B  |  Weber A  |  Weber C  |  Weber B
           ────────────────────────────────────────────────────────
Match?       ✅          ✅          ❌          ✅          ✅

Agreement = 4 matches / 5 cases = 80%
```

**The Problem:** This number can be misleading! If 90% of ankle fractures are Weber B, two doctors could agree 81% of the time just by always guessing "Weber B" – even without looking at the X-ray!

---

### 3.2 Cohen's Kappa (κ) - For 2 Raters

**What it is:** A statistic that measures agreement *beyond what you'd expect by random chance*.

**The Intuition:**

Imagine two students taking a multiple-choice test by randomly guessing. If there are 3 choices (A, B, C), they'd match about 33% of the time by pure luck. Kappa asks: "How much better than random chance did they do?"

**The Formula (simplified):**

```
Kappa = (Observed Agreement - Expected by Chance) / (Perfect Agreement - Expected by Chance)
```

Or more simply:
```
Kappa = (What we got - What luck would give us) / (What perfection would give us - What luck would give us)
```

**Example with numbers:**

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

**Interpreting Kappa (Landis & Koch scale):**

| Kappa Value | Interpretation | What It Means |
|-------------|----------------|---------------|
| < 0 | Poor | Worse than random chance (disagreement) |
| 0.00 - 0.20 | Slight | Barely better than guessing |
| 0.21 - 0.40 | Fair | Some agreement, but not great |
| 0.41 - 0.60 | Moderate | Reasonable agreement |
| 0.61 - 0.80 | Substantial | Good agreement |
| 0.81 - 1.00 | Almost Perfect | Excellent agreement |

**Limitation:** Cohen's Kappa only works for exactly 2 raters. What if you have 5 doctors?

---

### 3.3 Fleiss' Kappa - For Multiple Raters

**What it is:** An extension of Cohen's Kappa for 3 or more raters.

**The Setup:**

Instead of comparing pairs, Fleiss' Kappa looks at how many raters agreed on each case.

**Example:**

```
5 doctors classified 4 fractures:

Case    Weber A    Weber B    Weber C    (5 doctors per case)
──────────────────────────────────────────
  1        5          0          0       ← Perfect agreement (all said A)
  2        0          4          1       ← Good agreement (4/5 said B)
  3        2          2          1       ← Poor agreement (split)
  4        1          3          1       ← Moderate agreement (3/5 said B)
```

**The Calculation Idea:**

1. For each case, calculate how much agreement there is
2. Average across all cases
3. Compare to what you'd expect by chance
4. Apply the same formula as Cohen's Kappa

**Why It's Important:** In reliability studies, you typically want multiple experts (not just 2) to evaluate cases.

---

### 3.4 Confidence Intervals

**What it is:** A range that likely contains the "true" value.

**The Problem:**

If you calculate Kappa = 0.78, that's based on your sample. If different doctors had participated, you might get Kappa = 0.72 or 0.84. So how confident are you that the "true" reliability is around 0.78?

**The Solution:**

A 95% confidence interval (CI) gives you a range. For example:
- Kappa = 0.78, 95% CI [0.65, 0.91]

This means: "We're 95% confident the true Kappa is somewhere between 0.65 and 0.91."

**Why It Matters:**

```
Result A: Kappa = 0.78, 95% CI [0.65, 0.91]
          └── Confident it's at least "substantial" agreement

Result B: Kappa = 0.78, 95% CI [0.35, 0.95]
          └── Could be anywhere from "fair" to "almost perfect" – not useful!
```

The width of the CI depends on sample size. More responses = narrower CI = more certainty.

---

### 3.5 Weighted Kappa

**What it is:** A version of Kappa that accounts for "how wrong" a disagreement is.

**The Problem with Regular Kappa:**

Regular Kappa treats all disagreements equally:
- Doctor A says "Weber A", Doctor B says "Weber B" → 1 disagreement
- Doctor A says "Weber A", Doctor B says "Weber C" → 1 disagreement

But clinically, confusing A with B (adjacent categories) might be less serious than confusing A with C (opposite ends).

**Weighted Kappa Solution:**

Assign weights to disagreements:

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

**For Anklyze:** This could be useful for AO/OTA classifications where 44-B1 and 44-B2 are "closer" than 44-B1 and 44-C3.

---

### 3.6 Sensitivity and Specificity

**What they are:** Measures of how good a test is at detecting things.

**Applied to Classification:**

When comparing user responses to a gold standard:

```
                        Gold Standard
                        Weber A          Not Weber A
User Said    Weber A    True Positive    False Positive
             Not A      False Negative   True Negative
```

**Sensitivity** (True Positive Rate):
- Of all the cases that ARE Weber A, what percentage did we correctly identify?
- Formula: True Positives / (True Positives + False Negatives)
- "If it's really Weber A, how likely are we to catch it?"

**Specificity** (True Negative Rate):
- Of all the cases that are NOT Weber A, what percentage did we correctly rule out?
- Formula: True Negatives / (True Negatives + False Positives)
- "If it's not Weber A, how likely are we to correctly say it's not?"

**Example:**

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

---

### 3.7 Confusion Matrix

**What it is:** A table showing how classifications compare between predicted and actual (or between two raters).

**Example:**

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

**Reading the Matrix:**

- Diagonal (45, 78, 35, 16) = correct classifications
- Off-diagonal = errors
- Row totals = actual counts by gold standard
- Column totals = predicted counts by users

**What It Reveals:**

- SER has the most confusion (some mistaken for PA and PER)
- SA is rarely confused with PER (anatomically they're very different)
- Users tend to over-predict SER (88 predicted vs. 90 actual)

---

## 4. Current Implementation Analysis

### 4.1 What Anklyze Currently Calculates

| Metric | Implemented | Location |
|--------|-------------|----------|
| Percent Agreement | ✅ Yes | `statistics.go` |
| Cohen's Kappa | ✅ Yes | `statistics.go:23-26` |
| Cohen's Kappa with CI | ✅ Yes | `statistics.go:32-103` |
| Weighted Kappa | ✅ Yes | `statistics.go:111-191` (for AO/OTA) |
| Fleiss' Kappa | ⚠️ Limited | `statistics.go:200+` (returns nil with note for single-case studies) |
| Confusion Matrix | ✅ Yes | `statistics.go` |
| Category Counts | ✅ Yes | `statistics.go` |
| Gold Standard Accuracy | ✅ Yes | `statistics.go` |
| Sensitivity/Specificity | ✅ Yes | `statistics.go:184-276` |
| Per-Category Metrics (PPV, NPV, F1) | ✅ Yes | `statistics.go:184-276` |

### 4.2 How the Survey Feature Works

```
┌─────────────────┐
│  Admin creates  │
│     Study       │
│  (uploads X-rays│
│   sets gold     │
│   standard)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Study Published │
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  User 1 views   │      │  User 2 views   │
│  X-rays and     │      │  X-rays and     │
│  classifies     │      │  classifies     │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └──────────┬─────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │   Responses     │
         │   Collected     │
         │                 │
         │ - Classification│
         │ - Time taken    │
         │ - User metadata │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   Analytics     │
         │                 │
         │ - Distribution  │
         │ - Kappa scores  │
         │ - Gold std acc  │
         │ - CSV export    │
         └─────────────────┘
```

---

## 5. Identified Pain Points

### 5.1 Statistical Calculation Issues

#### ~~Problem 1: Cohen's Kappa Uses Only First Response~~ ✅ FIXED

**Status:** Resolved in February 2026

**Solution:** Modified to use the most recent (latest) response from each user instead of the first.

```go
// Now uses last response (most recent) instead of first
lastIdx0 := len(uniqueUsers[raters[0]]) - 1
lastIdx1 := len(uniqueUsers[raters[1]]) - 1
ratings := [][2]string{
    {uniqueUsers[raters[0]][lastIdx0], uniqueUsers[raters[1]][lastIdx1]},
}
```

**Location:** `backend/internal/service/statistics.go` lines 309-314

---

#### ~~Problem 2: Fleiss' Kappa Single-Subject Design~~ ✅ FIXED

**Status:** Fully resolved in February 2026

**Solution:** Implemented **StudyCohort** feature that groups multiple studies (cases) together for proper Fleiss' Kappa calculation.

**How it works:**

1. Admin creates a cohort and adds multiple studies (cases) to it
2. Raters are pre-assigned to the cohort
3. Raters complete all cases in the cohort
4. System calculates Fleiss' Kappa across all cases and raters

**For single-case studies (backward compatible):**

- Returns `null` for `fleiss_kappa` value
- Provides an explanatory note via `fleiss_kappa_note` field
- Frontend displays the note in an informational alert

**Cohort API Response:**

```json
{
  "fleiss_kappa": {
    "kappa": 0.72,
    "interpretation": "substantial",
    "num_raters": 5,
    "num_subjects": 10,
    "num_categories": 3,
    "confidence_interval": {
      "lower": 0.58,
      "upper": 0.86,
      "level": 0.95
    }
  }
}
```

**Key Files:**
- `backend/internal/domain/cohort.go` - Domain models
- `backend/internal/repository/postgres/cohort.go` - Repository implementation
- `backend/internal/api/cohort_handlers.go` - API endpoints
- `frontend/src/pages/admin/CohortReliabilityPage.tsx` - Reliability dashboard

---

#### ~~Problem 3: No Confidence Intervals~~ ✅ FIXED

**Status:** Resolved in February 2026

**Solution:** Added `CohensKappaWithCI()` method that calculates 95% confidence intervals using the standard error approximation formula.

**Implementation:**

- Formula: `SE = sqrt((Po * (1 - Po)) / (n * (1 - Pe)^2))`
- Supports 90%, 95%, and 99% confidence levels
- CI bounds clamped to valid Kappa range [-1, 1]

**API Response:**

```json
{
  "cohens_kappa": 0.72,
  "cohens_kappa_ci": {
    "lower": 0.58,
    "upper": 0.86,
    "level": 0.95
  }
}
```

**Frontend Display:** `0.720 [0.58, 0.86]` with tooltip showing confidence level

---

#### ~~Problem 4: No Weighted Kappa for Ordinal Data~~ ✅ FIXED

**Status:** Resolved in February 2026

**Solution:** Added `WeightedKappa()` method supporting both linear and quadratic weighting schemes.

**Implementation:**

- Linear weights: `w_ij = 1 - |i-j|/(k-1)`
- Quadratic weights: `w_ij = 1 - (i-j)²/(k-1)²`
- Automatically applied to AO/OTA classifications using predefined ordering

**AO/OTA Ordering:**

```go
var aoOTAOrdering = []string{
    "44-A1", "44-A2",
    "44-B1", "44-B2", "44-B3",
    "44-C1", "44-C2", "44-C3",
}
```

**API Response:**

```json
{
  "weighted_kappa": 0.78,
  "weighted_kappa_type": "linear"
}
```

---

### 5.2 Study Design Limitations

#### ~~Problem 5: Single Case Per Study~~ ✅ FIXED

**Status:** Resolved in February 2026

**Original Issue:** Each study contains one set of images representing one case, making proper reliability analysis impossible.

**Solution:** Implemented **StudyCohort** feature:

```text
StudyCohort
├── Metadata (title, description, status)
├── Case 1 (Study) ─── Images + Gold Standard
├── Case 2 (Study) ─── Images + Gold Standard
├── Case 3 (Study) ─── Images + Gold Standard
└── ... (unlimited cases)
```

**Features:**

- Group multiple studies into a cohort
- Drag-and-drop case reordering
- Per-case agreement metrics
- Identify "hard cases" with low agreement
- Proper Fleiss' Kappa calculation across all cases

**API Endpoints:**

- `POST /api/admin/cohorts` - Create cohort
- `POST /api/admin/cohorts/:id/cases` - Add case to cohort
- `GET /api/admin/cohorts/:id/reliability` - Get reliability metrics

---

#### ~~Problem 6: No Rater Cohort Management~~ ✅ FIXED

**Status:** Resolved in February 2026

**Original Issue:** No way to define "these 10 doctors should all evaluate these 20 cases."

**Solution:** Implemented **CohortUser** assignments with access control:

```go
type CohortUser struct {
    CohortID       uuid.UUID  // Which cohort
    UserID         uuid.UUID  // Which user
    UserEmail      string     // For display
    CasesCompleted int        // Progress tracking
    LastResponseAt *time.Time // Activity tracking
}
```

**Features:**

- Pre-assign specific raters to cohorts
- **Access control enforcement**: Only assigned raters can respond to cohort studies
- Progress tracking per rater (cases completed / total cases)
- Automatic progress updates when responses are submitted
- Identify complete vs. incomplete raters for Fleiss' Kappa

**Hybrid Access Model:**

- **Standalone studies**: Open to all authenticated users
- **Cohort studies**: Restricted to assigned raters only

**Error Response for Unauthorized Access:**

```json
{
  "error": "you are not assigned to this cohort study",
  "code": "NOT_COHORT_MEMBER"
}
```

**Key Files:**

- `backend/internal/api/study_handlers.go:1057-1072` - Access control check
- `backend/internal/repository/postgres/cohort.go` - User management
- `frontend/src/pages/admin/CohortEditorPage.tsx` - Rater assignment UI

---

#### Problem 7: No Algorithm Versioning

**The Issue:**

If the classification algorithm is updated, there's no record of which version produced which results.

**Scenario:**
1. January: Run study with Algorithm v1.0, get Kappa = 0.75
2. March: Update algorithm to fix edge case
3. June: Run new study, get Kappa = 0.82
4. Question: Is the improvement due to algorithm fix or different users/cases?

**Impact:**
- Cannot track algorithm improvements over time
- Cannot reprocess historical data with new algorithm
- Difficult to validate algorithm changes

---

### 5.3 Analysis Feature Gaps

#### ~~Problem 8: No Decision Tree Divergence Analysis~~ ✅ FIXED

**Status:** Resolved in February 2026

**Original Issue:**

When users disagree with the gold standard, we know WHAT they answered, but not WHERE in the decision tree they diverged.

**Example:**

```
Gold Standard: Weber B, SER, 44-B2
User Answer:   Weber B, PA, 44-B2

The user got Danis-Weber and AO/OTA correct, but Lauge-Hansen wrong.
WHERE did they go wrong?

The questionnaire path:
1. Which malleoli? → Lateral + Medial ✓
2. Fibular level? → Transindesmal ✓
3. Lateral morphology? → They said "Oblique" (should be "Spiral") ✗
                         ↓
                    This is where PA comes from instead of SER
```

**Solution:** Implemented **Gold Standard Input with Decision Path Tracking**

The system now captures the complete decision path when admins configure the gold standard classification:

**1. Gold Standard Questionnaire (GoldStandardInputDialog)**

Admins complete the same questionnaire that users see, capturing:
- `reference_classification`: The final classification result (Weber, Lauge-Hansen, AO/OTA, Bartonicek)
- `reference_input`: The complete decision path (FractureInput) with all questionnaire answers

**2. Decision Path Storage**

```typescript
// FractureInput stores the decision path
interface FractureInput {
  affectedMalleoli: string[];
  fibulaLevel?: 'infrasindesmal' | 'transindesmal' | 'suprasindesmal';
  lateralMorphology?: 'oblique' | 'spiral' | 'comminuted';
  medialMorphology?: 'oblique' | 'transverse';
  // ... all questionnaire answers
}

// Decision path string format: "lateral_only→transindesmal→spiral"
```

**3. Divergence Analysis Dashboard (StudyDivergencePage)**

For each user response, the system can now:
- Compare user's decision path against gold standard path
- Identify exact divergence point in the questionnaire
- Show which question caused the wrong classification
- Aggregate divergence statistics across all responses

**Key Files:**
- `frontend/src/components/studies/GoldStandardInputDialog.tsx` - Questionnaire for capturing gold standard input
- `frontend/src/pages/admin/StudyDivergencePage.tsx` - Divergence analysis dashboard
- `frontend/src/types/study.ts` - Added `reference_input` field to Study type

**Impact (Now Addressed):**
- ✅ Can identify which questions cause the most errors
- ✅ Can improve questionnaire wording for confusing questions
- ✅ Can provide targeted training based on common divergence points

---

#### Problem 9: No Expertise Stratification in Analytics

**The Issue:**

While expertise data (years of experience, specialty, training level) is collected, analytics don't break down results by expertise level.

**What we want to know:**
- Do attending physicians agree more than residents?
- Does experience correlate with gold standard accuracy?
- Which specialties have highest agreement?

**Impact:**
- Cannot validate algorithm against "expert consensus"
- Cannot identify if training improves reliability
- Missing insights for publication

---

#### Problem 10: No Time-Based Analysis

**The Issue:**

Response time is collected but not analyzed.

**Questions we could answer:**
- Do faster responses correlate with accuracy?
- Is there a "sweet spot" time for careful evaluation?
- Do experts classify faster?

**Impact:**
- Missing quality indicators
- Cannot detect "rushed" responses
- Cannot optimize recommended evaluation time

---

### 5.4 Data Quality Issues

#### Problem 11: No Response Validation

**The Issue:**

Users can submit responses without answering all required questions (if questionnaire allows partial completion).

**Impact:**
- Incomplete classification data
- NULL values in analytics
- Potential for invalid responses

---

#### Problem 12: Limited Impossible Combination Handling

**The Issue:**

The algorithm correctly identifies impossible combinations, but the survey doesn't track when users SELECT impossible combinations.

**Why it matters:**

If many users select impossible combinations, it indicates:
- Questionnaire is confusing
- Images are ambiguous
- Users need more training

**Impact:**
- Cannot identify problematic user patterns
- Cannot improve questionnaire design

---

## 6. Recommendations

### 6.1 Priority Matrix

#### Completed ✅

| Issue | Status | Notes |
|-------|--------|-------|
| Fix Cohen's Kappa multi-response handling | ✅ Done | Now uses latest response |
| Fix Fleiss' Kappa calculation | ✅ Done | Returns null for single-case, full calculation for cohorts |
| Add confidence intervals | ✅ Done | 95% CI for Cohen's Kappa and Fleiss' Kappa |
| Add weighted Kappa | ✅ Done | Linear weights for AO/OTA |
| Add sensitivity/specificity | ✅ Done | Per-category diagnostic metrics |
| Implement multi-case study support (StudyCohort) | ✅ Done | Full cohort management with reliability dashboard |
| Add rater cohort management | ✅ Done | Pre-assigned raters with access control enforcement |
| Rater progress tracking | ✅ Done | Automatic tracking of cases completed per rater |
| Add divergence analysis | ✅ Done | Decision path tracking with questionnaire-based gold standard configuration |

#### Remaining Work

| Priority | Issue | Effort | Impact |
| -------- | ----- | ------ | ------ |
| 🟡 Medium | Add algorithm versioning | Medium | Medium - Important for long-term |
| 🟡 Medium | Add expertise stratification in analytics | Medium | Medium - Valuable for publications |
| 🟢 Low | Add time-based analysis | Low | Low - Quality indicators |

### 6.2 Recommended Study Design

For a proper reliability study, consider this workflow:

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDY COHORT                             │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      ┌─────────┐   │
│  │ Case 1  │  │ Case 2  │  │ Case 3  │ ...  │ Case 30 │   │
│  │ X-rays  │  │ X-rays  │  │ X-rays  │      │ X-rays  │   │
│  │ Gold Std│  │ Gold Std│  │ Gold Std│      │ Gold Std│   │
│  └────┬────┘  └────┬────┘  └────┬────┘      └────┬────┘   │
│       │            │            │                 │        │
│       └────────────┴────────────┴────────┬───────┘        │
│                                          │                 │
│                                          ▼                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                 RATER PANEL (Fixed)                   │ │
│  │                                                       │ │
│  │  Dr. Smith    Dr. Jones    Dr. Lee    Dr. Garcia     │ │
│  │  (Attending)  (Attending)  (Resident) (Fellow)       │ │
│  │                                                       │ │
│  │  Each rater evaluates ALL 30 cases                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ANALYSIS:                                                  │
│  - Fleiss' Kappa across all raters and cases               │
│  - Per-case agreement (which cases are hardest?)           │
│  - Per-rater consistency (which raters are outliers?)      │
│  - Expertise stratification                                │
│  - Proper confidence intervals                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Implemented Features

#### ✅ Multi-Case Study (Study Cohort)

**Status:** Fully implemented

```text
StudyCohort
├── Metadata (title, description, status: draft/active/closed)
├── Case 1 (Study) ─── Images + Gold Standard
├── Case 2 (Study) ─── Images + Gold Standard
├── Case N (Study) ─── Images + Gold Standard
│
└── CohortUsers (Assigned Raters)
    ├── Rater 1 ─── Progress: 8/10 cases
    ├── Rater 2 ─── Progress: 10/10 cases ✓
    └── Rater N ─── Progress: 5/10 cases
```

**Key Features:**

- Create cohorts with unlimited cases
- Drag-and-drop case reordering
- Pre-assign raters with access control
- Automatic progress tracking
- Per-case agreement metrics
- "Hard cases" identification (low agreement)
- Fleiss' Kappa calculation across all complete raters

**Frontend Pages:**

- `/admin/cohorts` - List and manage cohorts
- `/admin/cohorts/:id` - Edit cohort, manage cases and raters
- `/admin/cohorts/:id/reliability` - Full reliability dashboard

---

#### ✅ Enhanced Analytics Dashboard

**Status:** Fully implemented for cohorts

```text
Cohort Reliability Report
├── Overview
│   ├── Fleiss' Kappa per classification system (with CI)
│   ├── Overall agreement percentages
│   └── Complete rater count
├── Per-System Analysis
│   ├── Danis-Weber (Fleiss' Kappa, Agreement %)
│   ├── Lauge-Hansen (Fleiss' Kappa, Agreement %)
│   ├── AO/OTA (Fleiss' Kappa, Agreement %)
│   └── Bartonicek (Fleiss' Kappa, Agreement %)
├── Per-Case Analysis
│   ├── Agreement per case
│   ├── Gold standard match rate
│   └── Hard case identification
├── Rater Progress
│   ├── Cases completed per rater
│   ├── Complete vs incomplete status
│   └── Last activity timestamp
└── Gold Standard Accuracy (aggregated)
```

---

### 6.4 Suggested Future Features

#### Algorithm Version Tracking

```text
Classification Result
├── Classification data
├── Algorithm version: "1.2.3"
├── Algorithm hash: "abc123..."
└── Timestamp
```

#### Additional Analytics Enhancements

- Expertise stratification (breakdown by specialty/experience)
- Time-based analysis (response time vs accuracy)

---

## 7. Algorithm Validation Protocol

The current implementation is ready for formal algorithm validation studies. This section describes how to conduct a validation study.

### 7.1 What Can Be Validated

| Aspect | Method | Metric |
|--------|--------|--------|
| **Inter-rater reliability** | Multiple doctors classify same cases | Fleiss' Kappa |
| **Gold standard accuracy** | Compare user classifications to expert consensus | Match rate % |
| **Questionnaire clarity** | Identify cases with high disagreement | Per-case agreement |
| **System-specific reliability** | Separate Kappa for each classification system | Per-system Kappa |

### 7.2 Validation Study Workflow

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
   ├── Create individual studies (one per case)
   │   ├── Upload X-ray images
   │   ├── Set reference classification (gold standard)
   │   └── Keep as draft initially
   ├── Create validation cohort
   │   └── Title: "Algorithm Validation Study [Year]"
   ├── Add all studies to cohort (drag-drop reorder as needed)
   ├── Assign raters
   │   ├── Minimum: 4 raters
   │   ├── Recommended: 6+ raters
   │   └── Mix of experience levels (attendings, fellows, residents)
   └── Activate cohort when ready

3. DATA COLLECTION
   ├── Raters access published studies
   ├── Each rater classifies ALL cases independently
   ├── System automatically tracks progress
   ├── No time limit, but record time taken per case
   └── Wait until all assigned raters complete all cases

4. ANALYSIS
   ├── Access Cohort Reliability Dashboard
   ├── Review metrics:
   │   ├── Fleiss' Kappa per system (with 95% CI)
   │   ├── Overall gold standard match rate
   │   ├── Per-case agreement breakdown
   │   └── Hard case identification
   └── Export CSV for external statistical analysis (SPSS, R, etc.)
```

### 7.3 Sample Size Recommendations

For publication-ready validation:

| Parameter | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Cases** | 30 | 50+ | Include variety of fracture types |
| **Raters** | 4 | 6+ | Mix of expertise levels |
| **Completion** | 100% | 100% | All raters must complete ALL cases |

### 7.4 Interpreting Results

#### Kappa Interpretation Guide

| Fleiss' Kappa | Interpretation | Action |
|---------------|----------------|--------|
| κ > 0.80 | Almost perfect | Algorithm validated ✅ |
| 0.61 - 0.80 | Substantial | Good reliability, review outlier cases |
| 0.41 - 0.60 | Moderate | Investigate confusion patterns |
| 0.21 - 0.40 | Fair | Questionnaire may need revision |
| < 0.21 | Slight/Poor | Significant issues to address |

#### Result Pattern Analysis

**High Kappa + High Gold Match**
- *Meaning:* Algorithm and questionnaire work well
- *Action:* Ready for clinical use ✅

**High Kappa + Low Gold Match**
- *Meaning:* Raters agree but on wrong answers
- *Action:* Training issue or ambiguous images

**Low Kappa + High Gold Match**
- *Meaning:* Random variation cancels out
- *Action:* Raters unreliable, need better instructions

**Low Kappa + Low Gold Match**
- *Meaning:* Questionnaire confusing or images inadequate
- *Action:* Review questions, improve image quality

### 7.5 Publication-Ready Outputs

The system provides data suitable for academic publication:

1. **Statistical Metrics**
   - Fleiss' Kappa with 95% confidence intervals
   - Percent agreement (overall and per-system)
   - Sensitivity/Specificity per classification category
   - PPV, NPV, F1 scores

2. **Exportable Data**
   - CSV export of all responses
   - Per-case metrics for tables
   - Confusion matrices for each classification system

3. **Visual Outputs**
   - Kappa gauge visualizations
   - Agreement distribution charts
   - Hard case identification

### 7.6 Validation Checklist

Before concluding a validation study, verify:

- [ ] All assigned raters completed ALL cases (100% completion required for Fleiss' Kappa)
- [ ] Gold standard was set by independent expert consensus
- [ ] Sample includes representative variety of fracture types
- [ ] At least 30 cases evaluated
- [ ] At least 4 raters participated
- [ ] Fleiss' Kappa calculated for each classification system
- [ ] Confidence intervals reported
- [ ] Hard cases reviewed and documented
- [ ] CSV data exported for independent verification

---

## 8. Glossary

| Term | Definition |
|------|------------|
| **Agreement** | The degree to which two or more raters give the same classification |
| **AO/OTA** | Arbeitsgemeinschaft für Osteosynthesefragen / Orthopaedic Trauma Association - a comprehensive fracture classification system |
| **Bartonicek** | Classification system specifically for posterior malleolus fractures |
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
| **Study/Survey** | In Anklyze, a case with images that users classify |
| **StudyCohort** | A group of multiple studies (cases) with assigned raters for proper reliability analysis |
| **Subject** | In reliability studies, the item being rated (a case/patient) |
| **Weighted Kappa** | Kappa that accounts for the degree of disagreement |

---

## Document Information

- **Created:** 2026-02-01
- **Last Updated:** 2026-02-02
- **Purpose:** Document reliability assessment pain points and explain statistical concepts
- **Audience:** Anklyze development team and stakeholders
- **Status:** Core features implemented (see Priority Matrix in section 6.1)

### Change Log

| Date | Changes |
| ---- | ------- |
| 2026-02-01 | Initial analysis document |
| 2026-02-01 | Implemented: Cohen's Kappa fix (uses latest response), Fleiss' Kappa note for single-case, Confidence Intervals, Weighted Kappa for AO/OTA, Sensitivity/Specificity/PPV/NPV/F1 metrics, Frontend display updates |
| 2026-02-02 | **Major Update - StudyCohort Implementation:** Full multi-case study support with cohort management, rater assignment with access control enforcement, progress tracking, per-case agreement metrics, hard case identification, and cohort reliability dashboard. Fleiss' Kappa now fully functional for cohort studies. |
| 2026-02-02 | Removed ICC from roadmap - not applicable for categorical classification data. Kappa + Weighted Kappa cover all use cases. |
| 2026-02-02 | **Divergence Analysis Implementation:** Added decision path tracking via `reference_input` field. New GoldStandardInputDialog allows admins to complete questionnaire to capture both classification result AND decision path. StudyDivergencePage dashboard shows where users diverge from gold standard in the decision tree. Problem 8 marked as FIXED. |

---

*This document was created to support the validation and improvement of the Anklyze ankle fracture classification system.*
