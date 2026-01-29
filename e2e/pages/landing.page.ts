import { Page, Locator, expect } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly heroTitle: Locator;
  readonly heroBadge: Locator;
  readonly startClassifyingButton: Locator;
  readonly learnMoreButton: Locator;
  readonly featuresSection: Locator;
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
    this.heroBadge = page.locator('section').first().locator('[class*="badge"]');
    this.startClassifyingButton = page.locator('nav').getByRole('link', { name: /start classifying|comenzar/i });
    this.learnMoreButton = page.getByRole('link', { name: /learn more|saber más/i });
    this.featuresSection = page.locator('section').filter({ hasText: /why anklyze|por qué/i });
    this.howItWorksSection = page.locator('#how-it-works');
    this.ctaSection = page.locator('section').filter({ hasText: /ready to classify|listo para clasificar/i });
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
    await this.languageSwitcher.click();
    const menuItem = this.page.getByRole('menuitem', {
      name: lang === 'en' ? /english/i : /español/i
    });
    // Language change triggers page reload
    await Promise.all([
      this.page.waitForEvent('load'),
      menuItem.click(),
    ]);
    await this.waitForPageLoad();
  }

  async expectVisible() {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.startClassifyingButton).toBeVisible();
  }

  async expectFeaturesVisible() {
    await expect(this.featuresSection).toBeVisible();
    // Check all 4 feature cards
    const featureCards = this.page.locator('section').filter({ hasText: /why anklyze|por qué/i }).locator('[class*="card"]');
    await expect(featureCards).toHaveCount(4);
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
