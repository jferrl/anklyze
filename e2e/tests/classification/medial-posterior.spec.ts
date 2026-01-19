import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Medial + Posterior Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Immediate Result Path', () => {
    test('should show bimaleolar alert after selection', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.expectBimaleolarAlert();
    });

    test('should enable classify button immediately after selection', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should classify medial + posterior bimaleolar fracture', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
    });
  });

  test.describe('Form Reset', () => {
    test('should reset form after clicking Classify Another', async () => {
      await classifyPage.selectMedialPosterior();
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();
      await classifyPage.expectFormReset();
    });
  });
});
