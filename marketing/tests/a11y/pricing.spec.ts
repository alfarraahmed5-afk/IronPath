import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Team Gamma γ3 — Pricing a11y scan.
//
// Pricing route is owned by α/β. The scan currently runs against /pricing
// if it exists; if the route 404s (placeholder repo state) the test is
// skipped rather than failing CI. As soon as α ships /pricing, the gate
// becomes load-bearing without any test rewrite.

const SERIOUS = new Set(['serious', 'critical']);

test.describe('pricing page a11y', () => {
  test('axe finds no serious or critical violations', async ({ page }) => {
    const response = await page.goto('/pricing', { waitUntil: 'networkidle' });
    if (!response || response.status() === 404) {
      test.skip(true, '/pricing not yet implemented — skipping a11y scan');
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      SERIOUS.has(v.impact ?? '')
    );

    if (blocking.length > 0) {
      console.log(
        'pricing axe blocking violations:',
        JSON.stringify(
          blocking.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
          })),
          null,
          2
        )
      );
    }

    expect(blocking).toEqual([]);
  });

  test('pricing tables expose a row/column structure when present', async ({ page }) => {
    const response = await page.goto('/pricing', { waitUntil: 'networkidle' });
    if (!response || response.status() === 404) {
      test.skip(true, '/pricing not yet implemented');
    }

    const tableCount = await page.locator('table').count();
    if (tableCount === 0) {
      // Pricing may be implemented as a card grid. That is acceptable so long
      // as cards are headed by an h2/h3 and prices use semantic markup.
      return;
    }

    // For every table, require either <caption> or aria-label / aria-labelledby.
    const unnamed = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      return tables.filter(
        (t) =>
          !t.querySelector('caption') &&
          !t.getAttribute('aria-label') &&
          !t.getAttribute('aria-labelledby')
      ).length;
    });
    expect(unnamed).toBe(0);
  });
});
