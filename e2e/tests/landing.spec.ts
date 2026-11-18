import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/landing.page';

test.describe('Landing Page', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test.describe('Page Load', () => {
    test('should display hero section with title', async () => {
      await expect(landingPage.heroTitle).toBeVisible();
      await expect(landingPage.heroTitle).toContainText(/ankle fracture|fractura de tobillo/i);
    });

    test('should display navigation with logo and start button', async () => {
      await expect(landingPage.logo).toBeVisible();
      await expect(landingPage.startClassifyingButton).toBeVisible();
    });

    test('should display the four classification systems', async () => {
      await landingPage.expectSystemsVisible();
    });

    test('should display the method section', async () => {
      await landingPage.expectHowItWorksVisible();
    });

    test('should display footer', async () => {
      await landingPage.expectFooterVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to classification page from the hero', async () => {
      await landingPage.clickStartClassifying();
      await expect(landingPage.page).toHaveURL('/classify');
    });

    test('should scroll to the method section from the hero', async () => {
      await landingPage.clickLearnMore();
      await expect(landingPage.howItWorksSection).toBeInViewport();
    });

    test('should have GitHub link pointing to correct repository', async () => {
      await expect(landingPage.githubLink).toHaveAttribute(
        'href',
        'https://github.com/jferrl/anklyze'
      );
    });
  });

  test.describe('Open source section', () => {
    test('should show the licence and how to cite', async ({ page }) => {
      const source = page.locator('#source');
      await expect(source).toBeVisible();
      await expect(source).toContainText(/apache/i);
      await expect(source.getByText('https://github.com/jferrl/anklyze')).toBeVisible();
    });
  });
});
