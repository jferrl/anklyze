import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/landing.page';

test.describe('Landing Page', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test.describe('Page Load', () => {
    test('should display hero section with title and badge', async () => {
      await expect(landingPage.heroTitle).toBeVisible();
      await expect(landingPage.heroTitle).toContainText(/ankle fractures|fracturas de tobillo/i);
    });

    test('should display navigation with logo and start button', async () => {
      await expect(landingPage.logo).toBeVisible();
      await expect(landingPage.startClassifyingButton).toBeVisible();
    });

    test('should display features section with 4 features', async () => {
      await landingPage.expectFeaturesVisible();
    });

    test('should display how it works section with 3 steps', async () => {
      await landingPage.expectHowItWorksVisible();
    });

    test('should display footer', async () => {
      await landingPage.expectFooterVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to classification page when clicking Start Classifying', async () => {
      await landingPage.clickStartClassifying();
      await expect(landingPage.page).toHaveURL('/classify');
    });

    test('should scroll to how it works section when clicking Learn More', async () => {
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

  test.describe('CTA Section', () => {
    test('should display call to action section', async ({ page }) => {
      const ctaTitle = page.locator('section').filter({ hasText: /ready to classify|listo para clasificar/i }).locator('h2');
      await expect(ctaTitle).toBeVisible();
    });

    test('should navigate to classification from CTA button', async ({ page }) => {
      const ctaButton = page.locator('section').filter({ hasText: /ready to classify|listo para clasificar/i }).getByRole('link');
      await ctaButton.click();
      await expect(page).toHaveURL('/classify');
    });
  });
});
