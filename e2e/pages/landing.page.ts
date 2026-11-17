import { Page, Locator, expect } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly heroTitle: Locator;
  readonly startClassifyingButton: Locator;
  readonly learnMoreButton: Locator;
  readonly systemsSection: Locator;
  readonly howItWorksSection: Locator;
  readonly ctaSection: Locator;
  readonly footer: Locator;
  readonly themeSwitcher: Locator;
  readonly languageSwitcher: Locator;
  readonly githubLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator('nav').getByText('Anklyze');
    this.heroTitle = page.locator('h1');
    this.startClassifyingButton = page.locator('nav').getByRole('link', { name: /start classifying|comenzar/i });
    this.learnMoreButton = page.getByRole('link', { name: /see how a result|ver cómo se llega/i });
    this.systemsSection = page.locator('#systems');
    this.howItWorksSection = page.locator('#how-it-works');
    this.ctaSection = page.locator('section').filter({ hasText: /first question|primera pregunta/i });
    this.footer = page.locator('footer');
    this.themeSwitcher = page.locator('#theme-switch');
    this.languageSwitcher = page.locator('nav button').filter({ has: page.locator('svg.lucide-globe') });
    this.githubLink = page.getByRole('link', { name: 'GitHub' });
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await expect(this.heroTitle).toBeVisible();
  }

  async clickStartClassifying() {
    await this.startClassifyingButton.click();
    await expect(this.page).toHaveURL('/classify');
  }

  async clickLearnMore() {
    await this.learnMoreButton.click();
    await expect(this.howItWorksSection).toBeInViewport();
  }

  async toggleTheme() {
    await this.themeSwitcher.click();
  }

  async switchLanguage(lang: 'en' | 'es') {
    // Wait for any existing dropdown to close before opening
    await expect(this.page.getByRole('menu')).toBeHidden({ timeout: 5000 }).catch(() => {});

    await this.languageSwitcher.click();
    await expect(this.page.getByRole('menu')).toBeVisible();

    const menuItem = this.page.getByRole('menuitem', {
      name: lang === 'en' ? /english/i : /español/i
    });
    await menuItem.click();

    // Wait for dropdown to close
    await expect(this.page.getByRole('menu')).toBeHidden();

    // Wait for UI to update with new language (no page reload)
    const expectedText = lang === 'en' ? /ankle fracture classifications/i : /clasificaciones de fractura/i;
    await expect(this.heroTitle).toContainText(expectedText);
  }

  async expectVisible() {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.startClassifyingButton).toBeVisible();
  }

  async expectSystemsVisible() {
    await expect(this.systemsSection).toBeVisible();
    await expect(this.systemsSection.locator('tbody tr')).toHaveCount(4);
  }

  async expectHowItWorksVisible() {
    await expect(this.howItWorksSection).toBeVisible();
    // Check all 3 steps
    const steps = this.howItWorksSection.locator('h3');
    await expect(steps).toHaveCount(3);
  }

  async expectFooterVisible() {
    await expect(this.footer).toBeVisible();
    await expect(this.footer.getByText('Anklyze')).toBeVisible();
  }
}
