import { test, expect } from '@playwright/test';
import { ClassifyPage } from '../../pages/classify.page';

test.describe('Lateral + Posterior Classification Path', () => {
  let classifyPage: ClassifyPage;

  test.beforeEach(async ({ page }) => {
    classifyPage = new ClassifyPage(page);
    await classifyPage.goto();
  });

  test.describe('Infrasindesmal Level', () => {
    test('should show "not possible" alert for transverse morphology', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelInfrasindesmal();
      await classifyPage.selectLPMorphologyInfraTransverse();

      await classifyPage.expectNotPossibleAlert();
      await classifyPage.expectClassifyButtonEnabled();
    });

    test('should classify transverse morphology as not possible', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelInfrasindesmal();
      await classifyPage.selectLPMorphologyInfraTransverse();
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
    });

    test('should classify oblique morphology with posterior type', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelInfrasindesmal();
      await classifyPage.selectLPMorphologyInfraOblique();
      await classifyPage.selectLPPosteriorTypeInfra('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SA');
      await classifyPage.expectDanisWeberResult('A');
    });
  });

  test.describe('Transindesmal Level', () => {
    test('should classify spiral morphology with posterior type', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransSpiral();
      await classifyPage.selectLPPosteriorTypeTrans('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('SER');
      await classifyPage.expectDanisWeberResult('B');
    });

    test('should classify oblique morphology with posterior type', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelTransindesmal();
      await classifyPage.selectLPMorphologyTransOblique();
      await classifyPage.selectLPPosteriorTypeTrans('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PA');
      await classifyPage.expectDanisWeberResult('B');
    });
  });

  test.describe('Suprasindesmal Level', () => {
    test('should classify with simple diaphyseal and posterior type', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelSuprasindesmal();
      await classifyPage.selectLPSuprasindesmalType('simple_diaphyseal');
      await classifyPage.selectLPPosteriorTypeSupra('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });

    test('should classify with multifragmentary and posterior type', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelSuprasindesmal();
      await classifyPage.selectLPSuprasindesmalType('multifragmentary');
      await classifyPage.selectLPPosteriorTypeSupra('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });

    test('should classify with proximal and posterior type', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelSuprasindesmal();
      await classifyPage.selectLPSuprasindesmalType('proximal');
      await classifyPage.selectLPPosteriorTypeSupra('posterolateral');
      await classifyPage.submitClassification();

      await classifyPage.expectResultsVisible();
      await classifyPage.expectLaugeHansenResult('PER');
      await classifyPage.expectDanisWeberResult('C');
    });
  });

  test.describe('Field Reset Behavior', () => {
    test('should reset morphology and posterior type when changing fibular level', async () => {
      await classifyPage.selectLateralPosterior();
      await classifyPage.selectLPLevelInfrasindesmal();
      await classifyPage.selectLPMorphologyInfraOblique();
      await classifyPage.selectLPPosteriorTypeInfra('posterolateral');
      await classifyPage.expectClassifyButtonEnabled();

      // Change fibular level - should reset dependent fields
      await classifyPage.selectLPLevelSuprasindesmal();
      await classifyPage.expectClassifyButtonDisabled();
    });
  });
});
