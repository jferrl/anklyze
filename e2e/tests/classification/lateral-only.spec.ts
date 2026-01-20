import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Lateral Only Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Infrasindesmal Level', () => {
    // NOTE: Infrasindesmal lateral-only no longer has morphology question
    // It goes directly to result (SA, Weber A)
    test('should classify directly as SA, Weber A (no morphology question)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelInfrasindesmal();
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
    test('should reset dependent fields when changing fibular level', async ({ page }) => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelTransindesmal();
      await classifyPage.selectLateralMorphologyTransSpiral();
      await classifyPage.expectClassifyButtonEnabled();

      // Change fibular level - should reset dependent fields
      await classifyPage.selectLateralLevelSuprasindesmal();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });
});
