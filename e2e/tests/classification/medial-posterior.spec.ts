import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Medial + Posterior Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Form Validation', () => {
    test('should disable classify button after selecting malleoli (needs CT scan)', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should enable classify button after answering CT scan No', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanNo();
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should enable classify button after CT scan Yes and posterior type', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanYes();
      await classifyPage.selectMPPosteriorType('posterolateral');
      await classifyPage.expectClassifyButtonEnabled();
    });
  });

  test.describe('Without CT Scan', () => {
    test('should classify medial + posterior without Bartonicek when CT scan is No', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanNo();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
    });
  });

  test.describe('With CT Scan (Bartonicek)', () => {
    test('should classify with extraincisural fragment (Bartonicek 1)', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanYes();
      await classifyPage.selectMPPosteriorType('extraincisural');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectBartonicekResult('1');
    });

    test('should classify with posterolateral fragment (Bartonicek 2)', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanYes();
      await classifyPage.selectMPPosteriorType('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectBartonicekResult('2');
    });

    test('should classify with posteromedial + posterolateral (Bartonicek 3)', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanYes();
      await classifyPage.selectMPPosteriorType('posteromedial_posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectBartonicekResult('3');
    });

    test('should classify with large posterolateral fragment (Bartonicek 4)', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanYes();
      await classifyPage.selectMPPosteriorType('large_posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectBartonicekResult('4');
    });
  });

  test.describe('Form Reset', () => {
    test('should reset form after clicking Classify Another', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.selectMPCTScanYes();
      await classifyPage.selectMPPosteriorType('posterolateral');
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();
      await classifyPage.expectFormReset();
    });
  });
});
