import { Page, Locator, expect } from '@playwright/test';

export class ClassifyPage {
  readonly page: Page;
  readonly formTitle: Locator;
  readonly classifyButton: Locator;
  readonly classifyAnotherButton: Locator;
  readonly loadingText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formTitle = page.locator('h1');
    this.classifyButton = page.getByRole('button', { name: /classify fracture|clasificar fractura/i });
    this.classifyAnotherButton = page.getByRole('button', { name: /classify another|clasificar otra/i });
    this.loadingText = page.getByText(/loading|cargando/i);
  }

  async goto() {
    await this.page.goto('/classify');
    await this.waitForFormLoad();
  }

  async waitForFormLoad() {
    // Wait for the API options to load
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/options') && resp.status() === 200
    );
    await expect(this.formTitle).toBeVisible();
  }

  // ==================== MALLEOLI SELECTION ====================

  async selectPosteriorOnly() {
    await this.page.locator('#malleoli-posterior_only').click();
  }

  async selectMedialOnly() {
    await this.page.locator('#malleoli-medial_only').click();
  }

  async selectLateralOnly() {
    await this.page.locator('#malleoli-lateral_only').click();
  }

  async selectMedialPosterior() {
    await this.page.locator('#malleoli-medial_posterior').click();
  }

  async selectLateralPosterior() {
    await this.page.locator('#malleoli-lateral_posterior').click();
  }

  async selectLateralMedial() {
    await this.page.locator('#malleoli-lateral_medial').click();
  }

  async selectTrimaleolar() {
    await this.page.locator('#malleoli-trimaleolar').click();
  }

  // ==================== POSTERIOR FRACTURE TYPE ====================

  async selectPosteriorTypeExtraincisural() {
    await this.page.locator('#post-type-extraincisural').click();
  }

  async selectPosteriorTypePosterolateral() {
    await this.page.locator('#post-type-posterolateral').click();
  }

  async selectPosteriorTypePosteromedialPosterolateral() {
    await this.page.locator('#post-type-posteromedial_posterolateral').click();
  }

  async selectPosteriorTypeLargePosterolateral() {
    await this.page.locator('#post-type-large_posterolateral').click();
  }

  // ==================== MEDIAL MORPHOLOGY ====================

  async selectMedialMorphologyOblique() {
    await this.page.locator('#medial-morph-oblique').click();
  }

  async selectMedialMorphologyTransverse() {
    await this.page.locator('#medial-morph-transverse').click();
  }

  // ==================== LATERAL ONLY - FIBULAR LEVEL ====================

  async selectLateralLevelInfrasindesmal() {
    await this.page.locator('#lat-level-infrasindesmal').click();
  }

  async selectLateralLevelTransindesmal() {
    await this.page.locator('#lat-level-transindesmal').click();
  }

  async selectLateralLevelSuprasindesmal() {
    await this.page.locator('#lat-level-suprasindesmal').click();
  }

  // ==================== LATERAL ONLY - MORPHOLOGY ====================

  async selectLateralMorphologyInfraTransverse() {
    await this.page.locator('#lat-morph-infra-transverse').click();
  }

  async selectLateralMorphologyInfraOblique() {
    await this.page.locator('#lat-morph-infra-oblique').click();
  }

  async selectLateralMorphologyTransSpiral() {
    await this.page.locator('#lat-morph-trans-spiral').click();
  }

  async selectLateralMorphologyTransOblique() {
    await this.page.locator('#lat-morph-trans-oblique').click();
  }

  // ==================== LATERAL ONLY - SUPRASINDESMAL TYPE ====================

  async selectSuprasindesmalTypeSimple() {
    await this.page.locator('#supra-type-simple_diaphyseal').click();
  }

  async selectSuprasindesmalTypeMultifragmentary() {
    await this.page.locator('#supra-type-multifragmentary').click();
  }

  async selectSuprasindesmalTypeProximal() {
    await this.page.locator('#supra-type-proximal').click();
  }

  // ==================== LATERAL + POSTERIOR ====================

  async selectLPLevelInfrasindesmal() {
    await this.page.locator('#lp-level-infrasindesmal').click();
  }

  async selectLPLevelTransindesmal() {
    await this.page.locator('#lp-level-transindesmal').click();
  }

  async selectLPLevelSuprasindesmal() {
    await this.page.locator('#lp-level-suprasindesmal').click();
  }

  async selectLPMorphologyInfraTransverse() {
    await this.page.locator('#lp-morph-infra-transverse').click();
  }

  async selectLPMorphologyInfraOblique() {
    await this.page.locator('#lp-morph-infra-oblique').click();
  }

  async selectLPMorphologyTransSpiral() {
    await this.page.locator('#lp-morph-trans-spiral').click();
  }

  async selectLPMorphologyTransOblique() {
    await this.page.locator('#lp-morph-trans-oblique').click();
  }

  async selectLPPosteriorTypeInfra(type: string) {
    await this.page.locator(`#lp-post-infra-${type}`).click();
  }

  async selectLPPosteriorTypeTrans(type: string) {
    await this.page.locator(`#lp-post-trans-${type}`).click();
  }

  async selectLPPosteriorTypeSupra(type: string) {
    await this.page.locator(`#lp-post-supra-${type}`).click();
  }

  async selectLPSuprasindesmalType(type: string) {
    await this.page.locator(`#lp-supra-${type}`).click();
  }

  // ==================== LATERAL + MEDIAL ====================

  async selectLMMedialOblique() {
    await this.page.locator('#lm-medial-oblique').click();
  }

  async selectLMMedialTransverse() {
    await this.page.locator('#lm-medial-transverse').click();
  }

  async selectLMInfraTransverseYes() {
    await this.page.locator('#lm-infra-trans-yes').click();
  }

  async selectLMInfraTransverseNo() {
    await this.page.locator('#lm-infra-trans-no').click();
  }

  async selectLMFibularLevelSuprasindesmal() {
    await this.page.locator('#lm-fib-level-suprasindesmal').click();
  }

  async selectLMFibularLevelInfrasindesmal() {
    await this.page.locator('#lm-fib-level-infrasindesmal').click();
  }

  async selectLMFibularLevelTransindesmal() {
    await this.page.locator('#lm-fib-level-transindesmal').click();
  }

  async selectLMSuprasindesmalType(type: string) {
    await this.page.locator(`#lm-supra-${type}`).click();
  }

  async selectLMMorphology(morph: string) {
    await this.page.locator(`#lm-morph-${morph}`).click();
  }

  async selectLMTransverseLevelInfrasindesmal() {
    await this.page.locator('#lm-trans-level-infrasindesmal').click();
  }

  async selectLMTransverseLevelTransindesmal() {
    await this.page.locator('#lm-trans-level-transindesmal').click();
  }

  // ==================== TRIMALEOLAR ====================

  async selectTrimaleolarLevelHigh() {
    await this.page.locator('#tri-level-high').click();
  }

  async selectTrimaleolarLevelLow() {
    await this.page.locator('#tri-level-low').click();
  }

  async selectTrimaleolarSupraType(type: string) {
    await this.page.locator(`#tri-supra-${type}`).click();
  }

  async selectTrimaleolarMorphology(morph: string) {
    await this.page.locator(`#tri-morph-${morph}`).click();
  }

  async selectTrimaleolarTransverseLevelInfrasindesmal() {
    await this.page.locator('#tri-trans-level-infrasindesmal').click();
  }

  async selectTrimaleolarTransverseLevelTransindesmal() {
    await this.page.locator('#tri-trans-level-transindesmal').click();
  }

  async selectTrimaleolarPosteriorType(type: string) {
    await this.page.locator(`#tri-post-${type}`).click();
  }

  // ==================== FIBULA TRACE PATTERN ====================
  // Values are: parasindesmotic_short and parasindesmotic_long

  async selectLateralFibulaTracePatternShort() {
    await this.page.locator('#lat-trace-parasindesmotic_short').click();
  }

  async selectLateralFibulaTracePatternLong() {
    await this.page.locator('#lat-trace-parasindesmotic_long').click();
  }

  async selectLPFibulaTracePatternShort() {
    await this.page.locator('#lp-trace-parasindesmotic_short').click();
  }

  async selectLPFibulaTracePatternLong() {
    await this.page.locator('#lp-trace-parasindesmotic_long').click();
  }

  async selectLMFibulaTracePatternShort() {
    await this.page.locator('#lm-trace-parasindesmotic_short').click();
  }

  async selectLMFibulaTracePatternLong() {
    await this.page.locator('#lm-trace-parasindesmotic_long').click();
  }

  async selectTriFibulaTracePatternShort() {
    await this.page.locator('#tri-trace-parasindesmotic_short').click();
  }

  async selectTriFibulaTracePatternLong() {
    await this.page.locator('#tri-trace-parasindesmotic_long').click();
  }

  // ==================== FORM SUBMISSION ====================

  async submitClassification() {
    // Set up response listener BEFORE clicking the button
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/classify') && resp.status() === 200
    );
    await this.classifyButton.click();
    await responsePromise;
  }

  async resetForm() {
    await this.classifyAnotherButton.click();
  }

  // ==================== ASSERTIONS ====================

  async expectClassifyButtonDisabled() {
    await expect(this.classifyButton).toBeDisabled();
  }

  async expectClassifyButtonEnabled() {
    await expect(this.classifyButton).toBeEnabled();
  }

  async expectResultsVisible() {
    await expect(this.classifyAnotherButton).toBeVisible();
  }

  async expectNotPossibleAlert() {
    const alert = this.page.locator('[class*="yellow"], [class*="bg-yellow"]');
    await expect(alert).toBeVisible();
  }

  async expectBimaleolarAlert() {
    const alert = this.page.locator('[class*="green"], [class*="bg-green"]');
    await expect(alert).toBeVisible();
  }

  async expectLaugeHansenResult(expectedType?: string) {
    // Find the card by its title text
    const lhCard = this.page.locator('div').filter({ hasText: /Lauge-Hansen Classification/i }).first();
    await expect(lhCard).toBeVisible();
    if (expectedType) {
      await expect(lhCard).toContainText(expectedType);
    }
  }

  async expectDanisWeberResult(expectedType?: string) {
    const dwCard = this.page.locator('div').filter({ hasText: /Danis-Weber Classification/i }).first();
    await expect(dwCard).toBeVisible();
    if (expectedType) {
      await expect(dwCard).toContainText(expectedType);
    }
  }

  async expectAOOTAResult(expectedCode?: string) {
    const aoCard = this.page.locator('div').filter({ hasText: /AO\/OTA Classification/i }).first();
    await expect(aoCard).toBeVisible();
    if (expectedCode) {
      await expect(aoCard).toContainText(expectedCode);
    }
  }

  async expectBartonicekResult(expectedType?: string) {
    const btCard = this.page.locator('div').filter({ hasText: /Bartonicek Classification/i }).first();
    await expect(btCard).toBeVisible();
    if (expectedType) {
      await expect(btCard).toContainText(expectedType);
    }
  }

  async expectFractureDescription() {
    // The fracture description is shown in a p tag with specific text
    const description = this.page.locator('p').filter({ hasText: /fracture|fractura/i }).first();
    await expect(description).toBeVisible();
  }

  async expectFormReset() {
    await expect(this.classifyButton).toBeVisible();
    await expect(this.classifyButton).toBeDisabled();
    await expect(this.classifyAnotherButton).not.toBeVisible();
  }
}
