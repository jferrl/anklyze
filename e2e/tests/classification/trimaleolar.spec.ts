import { test } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Trimaleolar Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('High Fibular Level (Suprasindesmal)', () => {
    test.describe('Simple Diaphyseal Type with Fibula Trace Pattern', () => {
      test('should classify with short trace pattern as PA, Weber C, AO 44 C1', async () => {
        await classifyPage.selectTrimaleolar();
        await classifyPage.selectTrimaleolarLevelHigh();
        await classifyPage.selectTrimaleolarSupraType('simple_diaphyseal');
        await classifyPage.selectTriFibulaTracePatternShort();
        await classifyPage.selectTriSupraCTScanYes();
        await classifyPage.selectTriSupraPosteriorType('posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PA');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C1');
        await classifyPage.expectBartonicekResult('2');
      });

      test('should classify with long trace pattern as PER, Weber C, AO 44 C1', async () => {
        await classifyPage.selectTrimaleolar();
        await classifyPage.selectTrimaleolarLevelHigh();
        await classifyPage.selectTrimaleolarSupraType('simple_diaphyseal');
        await classifyPage.selectTriFibulaTracePatternLong();
        await classifyPage.selectTriSupraCTScanYes();
        await classifyPage.selectTriSupraPosteriorType('extraincisural');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C1');
        await classifyPage.expectBartonicekResult('1');
      });
    });

    test.describe('Multifragmentary Type with Fibula Trace Pattern', () => {
      test('should classify with short trace pattern as PA, Weber C, AO 44 C2', async () => {
        await classifyPage.selectTrimaleolar();
        await classifyPage.selectTrimaleolarLevelHigh();
        await classifyPage.selectTrimaleolarSupraType('multifragmentary');
        await classifyPage.selectTriFibulaTracePatternShort();
        await classifyPage.selectTriSupraCTScanYes();
        await classifyPage.selectTriSupraPosteriorType('posteromedial_posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PA');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C2');
        await classifyPage.expectBartonicekResult('3');
      });

      test('should classify with long trace pattern as PER, Weber C, AO 44 C2', async () => {
        await classifyPage.selectTrimaleolar();
        await classifyPage.selectTrimaleolarLevelHigh();
        await classifyPage.selectTrimaleolarSupraType('multifragmentary');
        await classifyPage.selectTriFibulaTracePatternLong();
        await classifyPage.selectTriSupraCTScanYes();
        await classifyPage.selectTriSupraPosteriorType('large_posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C2');
        await classifyPage.expectBartonicekResult('4');
      });
    });

    test.describe('Proximal Type (Maisonneuve)', () => {
      test('should classify with proximal type as PER, Weber C, AO 44 C3 (no trace pattern needed)', async () => {
        await classifyPage.selectTrimaleolar();
        await classifyPage.selectTrimaleolarLevelHigh();
        await classifyPage.selectTrimaleolarSupraType('proximal');
        await classifyPage.selectTriSupraCTScanYes();
        await classifyPage.selectTriSupraPosteriorType('posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C3');
        await classifyPage.expectBartonicekResult('2');
      });
    });
  });

  test.describe('Low Fibular Level', () => {
    test('should classify oblique morphology as PA, Weber B, AO 44 B3', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('oblique');
      await classifyPage.selectTriLowCTScanYes();
      await classifyPage.selectTriLowPosteriorType('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
      await classifyPage.expectBartonicekResult('2');
    });

    test('should classify spiral morphology as SER, Weber B, AO 44 B3', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('spiral');
      await classifyPage.selectTriLowCTScanYes();
      await classifyPage.selectTriLowPosteriorType('extraincisural');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
      await classifyPage.expectBartonicekResult('1');
    });

    test('should show not possible alert for transverse + infrasindesmal', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('transverse');
      await classifyPage.selectTrimaleolarTransverseLevelInfrasindesmal();

      await classifyPage.expectNotPossibleAlert();
    });

    test('should classify transverse + transindesmal as PA, Weber B, AO 44 B3', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('transverse');
      await classifyPage.selectTrimaleolarTransverseLevelTransindesmal();
      await classifyPage.selectTriTransCTScanYes();
      await classifyPage.selectTriLowPosteriorType('posteromedial_posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
      await classifyPage.expectBartonicekResult('3');
    });

    test('should classify without Bartonicek when CT scan is No', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('oblique');
      await classifyPage.selectTriLowCTScanNo();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
    });
  });

  test.describe('Field Reset Behavior', () => {
    test('should reset morphology when changing fibular level', async () => {
      await classifyPage.selectTrimaleolar();
      await classifyPage.selectTrimaleolarLevelLow();
      await classifyPage.selectTrimaleolarMorphology('spiral');
      // Now need CT scan answer to be complete
      await classifyPage.selectTriLowCTScanNo();
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
      await classifyPage.selectTrimaleolarSupraType('proximal');
      await classifyPage.selectTriSupraCTScanYes();
      await classifyPage.selectTriSupraPosteriorType('posterolateral');
      await classifyPage.submitClassification();
      await classifyPage.expectResultsVisible();

      await classifyPage.resetForm();
      await classifyPage.expectFormReset();
    });
  });
});
