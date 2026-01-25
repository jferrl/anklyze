# Fix E2E Tests Based on Flowchart Changes

When the classification flowchart changes, use this command to update and fix the e2e tests.

## 1. Analyze Flowchart Changes

Read and analyze the current flowchart to understand the classification paths:
- `docs/Option Choice Decision Flow-EN.mmd` - English flowchart (source of truth for tests)
- `docs/Option Choice Decision Flow-ES.mmd` - Spanish flowchart

Key classification elements to track:
- **Lauge-Hansen**: SA, SER, PA, PER mechanisms
- **Danis-Weber**: A, B, C levels
- **AO/OTA**: A1, A2, B1, B2, B3, C1, C2, C3 codes
- **Bartonicek**: Types 1-4 (when CT scan available)

## 2. Update Page Object Methods

Update `e2e/pages/classify.page.ts` with any new helper methods needed:
- New malleoli selection methods
- New morphology selection methods
- New fibula trace pattern selection methods
- New posterior type selection methods

Ensure IDs match the frontend form element IDs in `frontend/src/components/FractureForm.tsx`.

## 3. Update Classification Test Files

Update the e2e test spec files to match the flowchart:

### Lateral Only (`e2e/tests/classification/lateral-only.spec.ts`)
- Infrasindesmal: SA, Weber A, AO A1 (no morphology question)
- Transindesmal + Spiral: SER, Weber B, AO B1
- Transindesmal + Oblique: PA, Weber B, AO B1
- Suprasindesmal + Simple/Multifragmentary + Short trace: PA, Weber C
- Suprasindesmal + Simple/Multifragmentary + Long trace: PER, Weber C
- Suprasindesmal + Proximal: PER, Weber C, AO C3

### Lateral + Posterior (`e2e/tests/classification/lateral-posterior.spec.ts`)
- Infrasindesmal: IMPOSSIBLE (SA doesn't involve posterior)
- Transindesmal + Spiral: SER, Weber B, AO B3 + Bartonicek
- Transindesmal + Oblique: PA, Weber B, AO B3 + Bartonicek
- Suprasindesmal: Same pattern as lateral-only but with Bartonicek

### Lateral + Medial (`e2e/tests/classification/lateral-medial.spec.ts`)
- Oblique medial + Infrasindesmal transverse fibula: SA, Weber A, AO A2
- Suprasindesmal: Similar to lateral-only
- Low fibular level patterns

### Trimaleolar (`e2e/tests/classification/trimaleolar.spec.ts`)
- High (Suprasindesmal): Similar patterns with fibula trace
- Low + Transverse + Infrasindesmal: IMPOSSIBLE
- Low + Transverse + Transindesmal: PA, Weber B, AO B3
- Low + Oblique: PA, Weber B, AO B3
- Low + Spiral: SER, Weber B, AO B3

## 4. Verify Test Expectations

Each test should verify:
1. `expectResultsVisible()` - Results panel appears
2. `expectLaugeHansenResult('TYPE')` - Correct mechanism
3. `expectDanisWeberResult('LEVEL')` - Correct Weber classification
4. `expectAOOTAResult('CODE')` - Correct AO/OTA code
5. `expectBartonicekResult('TYPE')` - When posterior malleolus involved with CT

## 5. Run Tests

```bash
# Run only classification e2e tests
make e2e-classification

# Or run all e2e tests
make e2e

# Debug mode if tests fail
make e2e-debug
```

## 6. Common Issues

### Selector Not Found
- Check element IDs in `FractureForm.tsx` match page object selectors
- Verify the question appears for the selected path

### Wrong Classification Result
- Compare test expectation with `engine.go` logic
- Check flowchart diagram for correct classification

### Button Not Enabled
- Ensure all required fields for the path are selected
- Check `isFormComplete()` logic in `FractureForm.tsx`

## Key Files Reference

### Test Files
- `e2e/pages/classify.page.ts` - Page object with helper methods
- `e2e/tests/classification/*.spec.ts` - Test spec files

### Backend (for expected results)
- `backend/internal/rules/engine.go` - Classification logic
- `backend/internal/rules/engine_test.go` - Unit tests with expected results

### Frontend (for element IDs)
- `frontend/src/components/FractureForm.tsx` - Form with element IDs

## Usage
```
/fix-e2e-tests
```
