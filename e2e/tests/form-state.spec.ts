import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../pages/classify.page';

test.describe('Form State Management', () => {
  let classifyPage: ClassifyPage;

  /** Shortest complete path: posterior only, small fragment, CT, extraincisural. */
  async function completePosteriorOnly() {
    await classifyPage.answer('involved_malleoli', 'posterior_only');
    await classifyPage.answer('articular_involvement', 'small_without_extension');
    await classifyPage.answer('has_ct_scan', 'true');
    await classifyPage.answer('posterior_fracture_type', 'extraincisural');
  }

  async function completeLateralOnlyTransindesmal() {
    await classifyPage.answer('involved_malleoli', 'lateral_only');
    await classifyPage.answer('fibular_level', 'transindesmal');
    await classifyPage.answer('fibula_trace_count', 'single');
    await classifyPage.answer('lateral_morphology', 'spiral');
    await classifyPage.answer('lateral_subtype', 'simple');
  }

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Initial State', () => {
    test('should display form title', async () => {
      await expect(classifyPage.formTitle).toBeVisible();
      await expect(classifyPage.formTitle).toContainText(/ankle fracture|fractura de tobillo/i);
    });

    test('should have classify button disabled initially', async () => {
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should not show classify another button initially', async () => {
      await expect(classifyPage.classifyAnotherButton).not.toBeVisible();
    });
  });

  test.describe('Form Completion Validation', () => {
    test('should enable button only when form is complete - posterior only path', async () => {
      await classifyPage.answer('involved_malleoli', 'posterior_only');
      await classifyPage.expectClassifyButtonDisabled();

      await classifyPage.answer('articular_involvement', 'small_without_extension');
      await classifyPage.expectClassifyButtonDisabled();

      // CT yes still needs the posterior type
      await classifyPage.answer('has_ct_scan', 'true');
      await classifyPage.expectClassifyButtonDisabled();

      await classifyPage.answer('posterior_fracture_type', 'extraincisural');
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should enable button only when form is complete - lateral only path', async () => {
      await classifyPage.answer('involved_malleoli', 'lateral_only');
      await classifyPage.expectClassifyButtonDisabled();

      await classifyPage.answer('fibular_level', 'transindesmal');
      await classifyPage.expectClassifyButtonDisabled();

      await classifyPage.answer('fibula_trace_count', 'single');
      await classifyPage.expectClassifyButtonDisabled();

      await classifyPage.answer('lateral_morphology', 'spiral');
      await classifyPage.expectClassifyButtonDisabled();

      await classifyPage.answer('lateral_subtype', 'simple');
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should enable button when CT scan is No for medial_posterior path', async () => {
      await classifyPage.answer('involved_malleoli', 'medial_posterior');
      await classifyPage.expectClassifyButtonDisabled();

      // No CT means no Bartonicek question
      await classifyPage.answer('has_ct_scan', 'false');
      await classifyPage.expectClassifyButtonEnabled();
    });
  });

  test.describe('Field Reset on Parent Change', () => {
    test('should reset all fields when changing malleoli selection', async ({ page }) => {
      await completeLateralOnlyTransindesmal();
      await classifyPage.expectClassifyButtonEnabled();

      await classifyPage.answer('involved_malleoli', 'medial_only');

      await expect(page.locator('#lateral_morphology-spiral')).not.toBeVisible();
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should reset dependent fields when changing fibular level in lateral only', async ({ page }) => {
      await completeLateralOnlyTransindesmal();
      await classifyPage.expectClassifyButtonEnabled();

      await classifyPage.answer('fibular_level', 'suprasindesmal');

      await expect(page.locator('#suprasindesmal_type-simple_diaphyseal')).toBeVisible();
      await expect(page.locator('#lateral_morphology-spiral')).not.toBeVisible();
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should reset dependent fields when changing fibular level in lateral posterior', async () => {
      await classifyPage.answer('involved_malleoli', 'lateral_posterior');
      await classifyPage.answer('fibular_level', 'transindesmal');
      await classifyPage.answer('lateral_morphology', 'spiral');
      await classifyPage.answer('has_ct_scan', 'true');
      await classifyPage.answer('posterior_fracture_type', 'posterolateral');
      await classifyPage.expectClassifyButtonEnabled();

      await classifyPage.answer('fibular_level', 'suprasindesmal');

      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should reset dependent fields when changing medial morphology in lateral medial', async () => {
      await classifyPage.answer('involved_malleoli', 'lateral_medial');
      await classifyPage.answer('medial_morphology', 'vertical');
      await classifyPage.answer('fibula_infrasindesmal_transverse', 'true');
      await classifyPage.expectClassifyButtonEnabled();

      await classifyPage.answer('medial_morphology', 'transverse_oblique');

      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should reset morphology when changing fibular level in trimaleolar', async ({ page }) => {
      await classifyPage.answer('involved_malleoli', 'trimaleolar');
      await classifyPage.answer('fibular_level', 'transindesmal');
      await classifyPage.answer('fibula_trace_count', 'single');
      await classifyPage.answer('lateral_morphology', 'spiral');
      await classifyPage.answer('medial_subtype', 'open_mortise');
      await classifyPage.answer('has_ct_scan', 'false');
      await classifyPage.expectClassifyButtonEnabled();

      await classifyPage.answer('fibular_level', 'suprasindesmal');

      await expect(page.locator('#lateral_morphology-spiral')).not.toBeVisible();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });

  test.describe('Result State', () => {
    test('should show results after successful classification', async () => {
      await completePosteriorOnly();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await expect(classifyPage.classifyButton).not.toBeVisible();
    });

    test('should show classify another button after classification', async () => {
      await completePosteriorOnly();
      await classifyPage.submitClassification();

      await expect(classifyPage.classifyAnotherButton).toBeVisible();
    });
  });

  test.describe('Form Reset', () => {
    test('should completely reset form when clicking Classify Another', async () => {
      await completePosteriorOnly();
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();

      await classifyPage.expectFormReset();
    });

    test('should allow starting a new classification after reset', async () => {
      await completePosteriorOnly();
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();

      // Second classification with a different path
      await classifyPage.answer('involved_malleoli', 'medial_only');
      await classifyPage.answer('articular_involvement', 'false');
      await classifyPage.answer('medial_morphology', 'vertical');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
    });
  });

  test.describe('Loading State', () => {
    // Skipped: Race condition - classification completes too fast to reliably catch disabled state
    test.skip('should disable button during classification', async () => {
      // The button is disabled during API call, but the call completes too fast to test reliably
    });
  });
});
