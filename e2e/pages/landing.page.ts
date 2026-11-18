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
  readonly heroFigure: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator('nav').getByText('Anklyze');
    this.heroTitle = page.locator('h1');
    this.startClassifyingButton = page.locator('main').getByRole('link', { name: /start classifying|comenzar a clasificar/i });
    this.learnMoreButton = page.getByRole('link', { name: /read the method|leer el método/i });
    this.systemsSection = page.locator('#systems');
    this.howItWorksSection = page.locator('#method');
    this.ctaSection = page.locator('#source');
    this.footer = page.locator('footer');
    this.themeSwitcher = page.locator('#theme-switch');
    this.languageSwitcher = page.locator('nav button').filter({ has: page.locator('svg.lucide-globe') });
    this.githubLink = page.getByRole('link', { name: 'GitHub', exact: true });
    this.heroFigure = page.locator('[data-landing-figure]');
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

  async expectHeroFigureVisible() {
    await expect(this.heroFigure.getByRole('img', { name: /weber b/i })).toBeVisible();
    // The plate is a raster render; it must have loaded, not just be in the DOM.
    await expect(this.heroFigure.locator('img[data-plate-image]')).not.toHaveJSProperty('naturalWidth', 0);
    await expect(this.heroFigure.locator('ol > li')).toHaveCount(5);
    await expect(this.heroFigure.getByText('44-B1.1', { exact: true })).toBeVisible();
    await expect(this.heroFigure.getByText(/^Fig\. Weber B/)).toBeVisible();
  }

  async expectSystemsVisible() {
    await expect(this.systemsSection).toBeVisible();
    await expect(this.systemsSection.locator('tbody tr')).toHaveCount(4);
  }

  async expectHowItWorksVisible() {
    await expect(this.howItWorksSection).toBeVisible();
    await expect(this.howItWorksSection.locator('dt')).toHaveCount(4);
  }

  async expectFooterVisible() {
    await expect(this.footer).toBeVisible();
    await expect(this.footer.getByText('Anklyze')).toBeVisible();
  }
}
