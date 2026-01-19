import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Lateral Only Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Infrasindesmal Level', () => {
    test('should classify with transverse morphology (SA II, Weber A)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelInfrasindesmal();
      await classifyPage.selectLateralMorphologyInfraTransverse();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
      await classifyPage.expectDanisWeberResult('A');
    });

    test('should classify with oblique morphology (SA II, Weber A)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelInfrasindesmal();
      await classifyPage.selectLateralMorphologyInfraOblique();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
      await classifyPage.expectDanisWeberResult('A');
    });
  });

  test.describe('Transindesmal Level', () => {
    test('should classify with spiral morphology (SER II, Weber B)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelTransindesmal();
      await classifyPage.selectLateralMorphologyTransSpiral();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
    });

    test('should classify with oblique morphology (PA II, Weber B)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelTransindesmal();
      await classifyPage.selectLateralMorphologyTransOblique();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
    });
  });

  test.describe('Suprasindesmal Level', () => {
    test('should classify with simple diaphyseal type (PER II, Weber C)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelSuprasindesmal();
      await classifyPage.selectSuprasindesmalTypeSimple();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });

    test('should classify with multifragmentary type (PER II, Weber C)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelSuprasindesmal();
      await classifyPage.selectSuprasindesmalTypeMultifragmentary();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });

    test('should classify with proximal type (PER II, Weber C)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelSuprasindesmal();
      await classifyPage.selectSuprasindesmalTypeProximal();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });
  });

  test.describe('Field Reset Behavior', () => {
    test('should reset morphology when changing fibular level', async ({ page }) => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelInfrasindesmal();
      await classifyPage.selectLateralMorphologyInfraTransverse();
      await classifyPage.expectClassifyButtonEnabled();

      // Change fibular level - should reset morphology
      await classifyPage.selectLateralLevelSuprasindesmal();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });
});
