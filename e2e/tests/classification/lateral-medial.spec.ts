import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Lateral + Medial Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Oblique Medial Morphology', () => {
    test('should classify when answering Yes to infrasindesmal transverse', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseYes();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
      await classifyPage.expectDanisWeberResult('A');
    });

    test('should continue to fibular level when answering No', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseNo();
      await classifyPage.expectClassifyButtonDisabled();
    });

    test('should classify with suprasindesmal level after No (short trace)', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseNo();
      await classifyPage.selectLMFibularLevelSuprasindesmal();
      await classifyPage.selectLMSuprasindesmalType('simple_diaphyseal');
      await classifyPage.selectLMFibulaTracePatternShort();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('C');
      await classifyPage.expectAOOTAResult('C1');
    });

    test('should classify with suprasindesmal level after No (long trace)', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseNo();
      await classifyPage.selectLMFibularLevelSuprasindesmal();
      await classifyPage.selectLMSuprasindesmalType('simple_diaphyseal');
      await classifyPage.selectLMFibulaTracePatternLong();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
      await classifyPage.expectAOOTAResult('C1');
    });

    test('should classify with suprasindesmal level after No (suprasindesmotic far trace)', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseNo();
      await classifyPage.selectLMFibularLevelSuprasindesmal();
      await classifyPage.selectLMSuprasindesmalType('simple_diaphyseal');
      await classifyPage.selectLMFibulaTracePatternFar();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
      await classifyPage.expectAOOTAResult('C1');
    });

    test('should classify with low fibular level and oblique morphology', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseNo();
      await classifyPage.selectLMFibularLevelTransindesmal();
      await classifyPage.selectLMMorphology('oblique');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });

    test('should classify with low fibular level and spiral morphology', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseNo();
      await classifyPage.selectLMFibularLevelTransindesmal();
      await classifyPage.selectLMMorphology('spiral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
    });
  });

  test.describe('Transverse Medial Morphology', () => {
    test('should classify with suprasindesmal level (short trace)', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialTransverse();
      await classifyPage.selectLMFibularLevelSuprasindesmal();
      await classifyPage.selectLMSuprasindesmalType('simple_diaphyseal');
      await classifyPage.selectLMFibulaTracePatternShort();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('C');
      await classifyPage.expectAOOTAResult('C1');
    });

    test('should classify with suprasindesmal level (long trace)', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialTransverse();
      await classifyPage.selectLMFibularLevelSuprasindesmal();
      await classifyPage.selectLMSuprasindesmalType('simple_diaphyseal');
      await classifyPage.selectLMFibulaTracePatternLong();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
      await classifyPage.expectAOOTAResult('C1');
    });

    test('should classify with low fibular level and oblique morphology', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialTransverse();
      await classifyPage.selectLMFibularLevelTransindesmal();
      await classifyPage.selectLMMorphology('oblique');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });

    test('should classify with low fibular level and spiral morphology', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialTransverse();
      await classifyPage.selectLMFibularLevelTransindesmal();
      await classifyPage.selectLMMorphology('spiral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
    });

    test('should classify transverse morphology with additional fibular level', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialTransverse();
      await classifyPage.selectLMFibularLevelTransindesmal();
      await classifyPage.selectLMMorphology('transverse');
      await classifyPage.selectLMTransverseLevelInfrasindesmal();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });
  });

  test.describe('Field Reset Behavior', () => {
    test('should reset all dependent fields when changing medial morphology', async () => {
      await classifyPage.selectLateralMedial();
      await classifyPage.selectLMMedialOblique();
      await classifyPage.selectLMInfraTransverseYes();
      await classifyPage.expectClassifyButtonEnabled();

      // Change medial morphology - should reset all dependent fields
      await classifyPage.selectLMMedialTransverse();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });
});
