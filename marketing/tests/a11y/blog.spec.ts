import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Team Gamma γ3 -- Blog a11y scan.
//
// /blog is owned by content team. Scan is conditional (skip on 404) so the
// gate enables itself the moment the route ships.

const SERIOUS = new Set(['serious', 'critical']);

test.describe('blog index a11y', () => {
  test('axe finds no serious or critical violations', async ({ page }) => {
    const response = await page.goto('/blog', { waitUntil: 'networkidle' });
    if (!response || response.status() === 404) {
      test.skip(true, '/blog not yet implemented -- skipping a11y scan');
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      SERIOUS.has(v.impact ?? '')
    );

    if (blocking.length > 0) {
      console.log(
        'blog axe blocking violations:',
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

  test('every article link has discernible text', async ({ page }) => {
    const response = await page.goto('/blog', { waitUntil: 'networkidle' });
    if (!response || response.status() === 404) {
      test.skip(true, '/blog not yet implemented');
    }

    const orphans = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('article a, a[data-blog-link]'));
      return links.filter((a) => {
        const text = (a.textContent ?? '').trim();
        const aria = a.getAttribute('aria-label') ?? '';
        return !text && !aria;
      }).length;
    });

    expect(orphans).toBe(0);
  });
});
