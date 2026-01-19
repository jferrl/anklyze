import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Medial Only Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Form Validation', () => {
    test('should disable classify button after selecting only malleoli', async () => {
      await classifyPage.selectMedialOnly();
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should enable button after selecting medial morphology', async () => {
      await classifyPage.selectMedialOnly();
      await classifyPage.selectMedialMorphologyOblique();
      await classifyPage.expectClassifyButtonEnabled();
    });
  });

  test.describe('Oblique Morphology', () => {
    test('should classify medial only with oblique morphology', async () => {
      await classifyPage.selectMedialOnly();
      await classifyPage.selectMedialMorphologyOblique();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
    });
  });

  test.describe('Transverse Morphology', () => {
    test('should classify medial only with transverse morphology', async () => {
      await classifyPage.selectMedialOnly();
      await classifyPage.selectMedialMorphologyTransverse();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
    });
  });

  test.describe('Form Reset', () => {
    test('should reset form after clicking Classify Another', async () => {
      await classifyPage.selectMedialOnly();
      await classifyPage.selectMedialMorphologyOblique();
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();
      await classifyPage.expectFormReset();
    });
  });
});
