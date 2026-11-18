import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';

// Generated from the draw.io by scripts/generate_e2e_classification_cases.py; do not edit by hand.
interface Case {
  id: string;
  terminal_id: string;
  path: { question: string; answer: string }[];
  expected: Record<'ao' | 'lauge_hansen' | 'danis_weber' | 'bartonicek', string | null>;
  terminal: string;
}

const cases: Case[] = JSON.parse(
  readFileSync(join(__dirname, '../../fixtures/classification-cases.json'), 'utf-8'),
);

// Paths where the app disagrees with the draw.io, keyed by draw.io terminal id.
// Each entry is a finding against the app, not a wrong expectation.
const KNOWN_DISCREPANCIES: Record<string, string> = {
  // Draw.io says "AO clasificable" (no code); the app shows AO "No clasificable", as for the
  // three sibling posterior types. Possibly a missing "no" in the draw.io; needs the clinician.
  '0S3fIhuK620pGgQrKJa_-70': 'AO: draw.io "clasificable", app "No clasificable"',
};

const SYSTEMS = [
  ['lauge_hansen', 'Lauge-Hansen'],
  ['danis_weber', 'Danis-Weber'],
  ['ao', 'AO/OTA'],
  ['bartonicek', 'Bartonicek'],
] as const;

/** Compares labels ignoring case, accents and whitespace, which the draw.io writes loosely. */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');

function expectedText(system: string, value: string): string | RegExp {
  // "AO clasificable" names no code; any AO code satisfies it.
  if (system === 'ao' && value === 'clasificable') return /^4[34]-/;
  // The draw.io says "no clasificable" also where the app says "not applicable" (no posterior fragment).
  if (system === 'bartonicek' && value === 'No clasificable') return /^No (clasificable|aplicable)$/;
  return value;
}

async function answer(page: Page, index: number, step: Case['path'][number]) {
  // The form renders one radiogroup per visible question, in tree order.
  const group = page.getByRole('radiogroup').nth(index);
  await expect(group, `question ${index + 1} "${step.question}" not shown`).toBeVisible();
  const options = group.getByRole('radio');
  // span.flex-1 is the label, without the keyboard hint.
  const labels = await options.locator('span.flex-1').allInnerTexts();
  const match = labels.findIndex((l) => normalize(l) === normalize(step.answer));
  expect(match, `"${step.answer}" not among options of question ${index + 1}: ${JSON.stringify(labels)}`)
    .toBeGreaterThanOrEqual(0);
  await options.nth(match).click();
}

test.describe('Classification paths from the draw.io', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('language', 'es'));
  });

  for (const c of cases) {
    const reason = KNOWN_DISCREPANCIES[c.terminal_id];
    const title = `${c.id} [${c.terminal_id}]: ${c.path.map((s) => s.answer).join(' > ')}`;

    (reason ? test.fixme : test)(title, async ({ page }) => {
      test.info().annotations.push({ type: 'draw.io terminal', description: c.terminal });

      await page.goto('/classify');
      for (const [i, step] of c.path.entries()) {
        await answer(page, i, step);
      }
      // The form must not ask anything the draw.io path does not.
      await expect(page.getByRole('radiogroup')).toHaveCount(c.path.length);

      const classified = page.waitForResponse((r) => r.url().includes('/api/classify') && r.ok());
      await page.getByRole('button', { name: /clasificar fractura/i }).click();
      await classified;

      for (const [key, name] of SYSTEMS) {
        const value = c.expected[key];
        if (value === null) continue; // the draw.io terminal does not state this system
        const code = page
          .locator('dl > div')
          .filter({ has: page.locator('dt', { hasText: name }) })
          .locator('dd > p')
          .first();
        await expect.soft(code, name).toHaveText(expectedText(key, value));
      }
    });
  }
});
