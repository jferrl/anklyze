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
    // It goes directly to result (SA, Weber A, AO 44 A1)
    test('should classify directly as SA, Weber A, AO 44 A1 (no morphology question)', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelInfrasindesmal();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
      await classifyPage.expectDanisWeberResult('A');
      await classifyPage.expectAOOTAResult('A1');
    });
  });

  test.describe('Transindesmal Level', () => {
    test('should classify spiral morphology as SER, Weber B, AO 44 B', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelTransindesmal();
      await classifyPage.selectLateralMorphologyTransSpiral();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B');
    });

    test('should classify oblique morphology as PA, Weber B, AO 44 B', async () => {
      await classifyPage.selectLateralOnly();
      await classifyPage.selectLateralLevelTransindesmal();
      await classifyPage.selectLateralMorphologyTransOblique();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B');
    });
  });

  test.describe('Suprasindesmal Level', () => {
    test.describe('Simple Diaphyseal Type with Fibula Trace Pattern', () => {
      test('should classify with short trace pattern as PA, Weber C, AO 44 C1', async () => {
        await classifyPage.selectLateralOnly();
        await classifyPage.selectLateralLevelSuprasindesmal();
        await classifyPage.selectSuprasindesmalTypeSimple();
        await classifyPage.selectLateralFibulaTracePatternShort();
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PA');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C1');
      });

      test('should classify with long trace pattern as PER, Weber C, AO 44 C1', async () => {
        await classifyPage.selectLateralOnly();
        await classifyPage.selectLateralLevelSuprasindesmal();
        await classifyPage.selectSuprasindesmalTypeSimple();
        await classifyPage.selectLateralFibulaTracePatternLong();
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C1');
      });
    });

    test.describe('Multifragmentary Type with Fibula Trace Pattern', () => {
      test('should classify with short trace pattern as PA, Weber C, AO 44 C2', async () => {
        await classifyPage.selectLateralOnly();
        await classifyPage.selectLateralLevelSuprasindesmal();
        await classifyPage.selectSuprasindesmalTypeMultifragmentary();
        await classifyPage.selectLateralFibulaTracePatternShort();
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PA');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C2');
      });

      test('should classify with long trace pattern as PER, Weber C, AO 44 C2', async () => {
        await classifyPage.selectLateralOnly();
        await classifyPage.selectLateralLevelSuprasindesmal();
        await classifyPage.selectSuprasindesmalTypeMultifragmentary();
        await classifyPage.selectLateralFibulaTracePatternLong();
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C2');
      });
    });

    test.describe('Proximal Type (Maisonneuve)', () => {
      test('should classify with proximal type as PER, Weber C, AO 44 C3 (no trace pattern needed)', async () => {
        await classifyPage.selectLateralOnly();
        await classifyPage.selectLateralLevelSuprasindesmal();
        await classifyPage.selectSuprasindesmalTypeProximal();
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C3');
      });
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
