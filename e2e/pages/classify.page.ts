import { Page, Locator, expect } from '@playwright/test';

export class ClassifyPage {
  readonly page: Page;
  readonly formTitle: Locator;
  readonly classifyButton: Locator;
  readonly classifyAnotherButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formTitle = page.locator('h1');
    this.classifyButton = page.getByRole('button', { name: /classify fracture|clasificar fractura/i });
    this.classifyAnotherButton = page.getByRole('button', { name: /start over|empezar de nuevo/i });
  }

  async goto() {
    await this.page.goto('/classify');
    // Form options are built from the i18n bundle, so there is no request to wait for.
    await expect(this.formTitle).toBeVisible();
  }

  /** answer picks an option; the form ids each option as `<question field>-<option value>`. */
  async answer(question: string, value: string) {
    await this.page.locator(`#${question}-${value}`).click();
  }

  async submitClassification() {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/classify') && resp.status() === 200
    );
    await this.classifyButton.click();
    await responsePromise;
  }

  async resetForm() {
    await this.classifyAnotherButton.click();
  }

  async expectClassifyButtonDisabled() {
    await expect(this.classifyButton).toBeDisabled();
  }

  async expectClassifyButtonEnabled() {
    await expect(this.classifyButton).toBeEnabled();
  }

  async expectResultsVisible() {
    await expect(this.classifyAnotherButton).toBeVisible();
  }

  async expectLaugeHansenResult(expected: string) {
    const code = this.page
      .locator('dl > div')
      .filter({ has: this.page.locator('dt', { hasText: 'Lauge-Hansen' }) })
      .locator('dd > p')
      .first();
    await expect(code).toHaveText(expected);
  }

  async expectFormReset() {
    await expect(this.classifyButton).toBeVisible();
    await expect(this.classifyButton).toBeDisabled();
    await expect(this.classifyAnotherButton).not.toBeVisible();
  }
}
