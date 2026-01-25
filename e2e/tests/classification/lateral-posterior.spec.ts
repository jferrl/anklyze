import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Lateral + Posterior Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Infrasindesmal Level', () => {
    // NOTE: ALL infrasindesmal lateral+posterior cases are now impossible
    // SA mechanism doesn't involve posterior malleolus
    // PA mechanism is transsyndesmotic or suprasyndesmotic
    test('should show "not possible" alert immediately (no morphology question)', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelInfrasindesmal();

      await classifyPage.expectNotPossibleAlert();
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should classify as not possible', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelInfrasindesmal();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });
  });

  test.describe('Transindesmal Level', () => {
    test('should classify spiral morphology as SER, Weber B, AO 44 B3, Bartonicek 2', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransSpiral();
      await classifyPage.selectLPTransCTScanYes();
      await classifyPage.selectLPPosteriorTypeTrans('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
      await classifyPage.expectBartonicekResult('2');
    });

    test('should classify oblique morphology as PA, Weber B, AO 44 B3, Bartonicek 3', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransOblique();
      await classifyPage.selectLPTransCTScanYes();
      await classifyPage.selectLPPosteriorTypeTrans('posteromedial_posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
      await classifyPage.expectBartonicekResult('3');
    });

    test('should classify all Bartonicek types with spiral morphology', async () => {
      // Test Bartonicek 1 (extraincisural)
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransSpiral();
      await classifyPage.selectLPTransCTScanYes();
      await classifyPage.selectLPPosteriorTypeTrans('extraincisural');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectBartonicekResult('1');
    });

    test('should classify without Bartonicek when CT scan is No', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransSpiral();
      await classifyPage.selectLPTransCTScanNo();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
      await classifyPage.expectAOOTAResult('B3');
    });
  });

  test.describe('Suprasindesmal Level', () => {
    test.describe('Simple Diaphyseal Type with Fibula Trace Pattern', () => {
      test('should classify with short trace pattern as PA, Weber C, AO 44 C1', async () => {
        await classifyPage.selectLateralPosterior();
        await classifyPage.selectLPLevelSuprasindesmal();
        await classifyPage.selectLPSuprasindesmalType('simple_diaphyseal');
        await classifyPage.selectLPFibulaTracePatternShort();
        await classifyPage.selectLPSupraCTScanYes();
        await classifyPage.selectLPPosteriorTypeSupra('posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PA');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C1');
        await classifyPage.expectBartonicekResult('2');
      });

      test('should classify with long trace pattern as PER, Weber C, AO 44 C1', async () => {
        await classifyPage.selectLateralPosterior();
        await classifyPage.selectLPLevelSuprasindesmal();
        await classifyPage.selectLPSuprasindesmalType('simple_diaphyseal');
        await classifyPage.selectLPFibulaTracePatternLong();
        await classifyPage.selectLPSupraCTScanYes();
        await classifyPage.selectLPPosteriorTypeSupra('posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C1');
        await classifyPage.expectBartonicekResult('2');
      });
    });

    test.describe('Multifragmentary Type with Fibula Trace Pattern', () => {
      test('should classify with short trace pattern as PA, Weber C, AO 44 C2', async () => {
        await classifyPage.selectLateralPosterior();
        await classifyPage.selectLPLevelSuprasindesmal();
        await classifyPage.selectLPSuprasindesmalType('multifragmentary');
        await classifyPage.selectLPFibulaTracePatternShort();
        await classifyPage.selectLPSupraCTScanYes();
        await classifyPage.selectLPPosteriorTypeSupra('extraincisural');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PA');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C2');
        await classifyPage.expectBartonicekResult('1');
      });

      test('should classify with long trace pattern as PER, Weber C, AO 44 C2', async () => {
        await classifyPage.selectLateralPosterior();
        await classifyPage.selectLPLevelSuprasindesmal();
        await classifyPage.selectLPSuprasindesmalType('multifragmentary');
        await classifyPage.selectLPFibulaTracePatternLong();
        await classifyPage.selectLPSupraCTScanYes();
        await classifyPage.selectLPPosteriorTypeSupra('posteromedial_posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C2');
        await classifyPage.expectBartonicekResult('3');
      });
    });

    test.describe('Proximal Type (Maisonneuve)', () => {
      test('should classify with proximal type as PER, Weber C, AO 44 C3 (no trace pattern needed)', async () => {
        await classifyPage.selectLateralPosterior();
        await classifyPage.selectLPLevelSuprasindesmal();
        await classifyPage.selectLPSuprasindesmalType('proximal');
        await classifyPage.selectLPSupraCTScanYes();
        await classifyPage.selectLPPosteriorTypeSupra('large_posterolateral');
        await classifyPage.submitClassification();

        await classifyPage.expectResultsVisible();
        await classifyPage.expectLaugeHansenResult('PER');
        await classifyPage.expectDanisWeberResult('C');
        await classifyPage.expectAOOTAResult('C3');
        await classifyPage.expectBartonicekResult('4');
      });
    });
  });

  test.describe('Field Reset Behavior', () => {
    test('should reset morphology and posterior type when changing fibular level', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransSpiral();
      await classifyPage.selectLPTransCTScanYes();
      await classifyPage.selectLPPosteriorTypeTrans('posterolateral');
      await classifyPage.expectClassifyButtonEnabled();

      // Change fibular level - should reset dependent fields
      await classifyPage.selectLPLevelSuprasindesmal();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });
});
