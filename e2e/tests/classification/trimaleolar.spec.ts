import { test } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Trimaleolar Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('High Fibular Level (Suprasindesmal)', () => {
    test('should classify with simple diaphyseal type', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelHigh();
      await classifyPage.selectTrimaleolarSupraType('simple_diaphyseal');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });

    test('should classify with multifragmentary type', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelHigh();
      await classifyPage.selectTrimaleolarSupraType('multifragmentary');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });

    test('should classify with proximal type', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelHigh();
      await classifyPage.selectTrimaleolarSupraType('proximal');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });
  });

  test.describe('Low Fibular Level', () => {
    test('should classify with oblique morphology', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('oblique');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });

    test('should classify with spiral morphology', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('spiral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
    });

    test('should show not possible alert for transverse + infrasindesmal', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('transverse');
      await classifyPage.selectTrimaleolarTransverseLevelInfrasindesmal();

      await classifyPage.expectNotPossibleAlert();
    });

    test('should classify transverse + transindesmal', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('transverse');
      await classifyPage.selectTrimaleolarTransverseLevelTransindesmal();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });
  });

  test.describe('Field Reset Behavior', () => {
    test('should reset morphology when changing fibular level', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('spiral');
      await classifyPage.expectClassifyButtonEnabled();

      // Change fibular level - should reset morphology
      await classifyPage.selectTrimaleolarLevelHigh();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });

  test.describe('Form Reset', () => {
    test('should reset form after clicking Classify Another', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelHigh();
      await classifyPage.selectTrimaleolarSupraType('simple_diaphyseal');
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();
      await classifyPage.expectFormReset();
    });
  });
});
