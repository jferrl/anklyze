import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Posterior Only Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Form Validation', () => {
    test('should disable classify button initially', async () => {
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should keep button disabled after selecting only malleoli', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should enable button after answering CT scan No', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanNo();
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should enable button after selecting CT scan Yes and posterior type', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanYes();
      await classifyPage.selectPosteriorTypeExtraincisural();
      await classifyPage.expectClassifyButtonEnabled();
    });
  });

  test.describe('Without CT Scan', () => {
    test('should classify posterior only without Bartonicek when CT scan is No', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanNo();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });
  });

  test.describe('Extraincisural (Bartonicek 1)', () => {
    test('should classify posterior only with extraincisural fragment', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanYes();
      await classifyPage.selectPosteriorTypeExtraincisural();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectBartonicekResult('1');
    });
  });

  test.describe('Posterolateral (Bartonicek 2)', () => {
    test('should classify posterior only with posterolateral fragment', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanYes();
      await classifyPage.selectPosteriorTypePosterolateral();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectBartonicekResult('2');
    });
  });

  test.describe('Posteromedial + Posterolateral (Bartonicek 3)', () => {
    test('should classify posterior only with both fragments', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanYes();
      await classifyPage.selectPosteriorTypePosteromedialPosterolateral();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectBartonicekResult('3');
    });
  });

  test.describe('Large Posterolateral (Bartonicek 4)', () => {
    test('should classify posterior only with large posterolateral fragment', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanYes();
      await classifyPage.selectPosteriorTypeLargePosterolateral();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectBartonicekResult('4');
    });
  });

  test.describe('Form Reset', () => {
    test('should reset form after clicking Classify Another', async () => {
      await classifyPage.selectPosteriorOnly();
      await classifyPage.selectPosteriorCTScanYes();
      await classifyPage.selectPosteriorTypeExtraincisural();
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();
      await classifyPage.expectFormReset();
    });
  });
});
