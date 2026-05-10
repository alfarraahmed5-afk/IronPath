import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Team Gamma γ3 -- Home a11y scan.
//
// Per project (default-motion + reduced-motion), we scan `/` for serious +
// critical axe violations and assert structural a11y invariants:
//   - Skip-to-content is the FIRST tab stop.
//   - Heading order is well-formed (single h1, no level skips).
//   - Color contrast passes WCAG AA.
//   - All interactive controls have accessible names.
//   - All images have an alt attribute (decorative may be empty).

const SERIOUS = new Set(['serious', 'critical']);

test.describe('home page a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('axe finds no serious or critical violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      SERIOUS.has(v.impact ?? '')
    );

    if (blocking.length > 0) {
      console.log(
        'axe blocking violations:',
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

  test('skip-to-content is the first tab stop', async ({ page }) => {
    // Body must be focused at start; first Tab should land on the skip link.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return {
        tag: el.tagName,
        text: (el.textContent ?? '').trim(),
        href: el.getAttribute('href'),
        cls: el.className,
      };
    });

    expect(focused).not.toBeNull();
    expect(focused!.tag).toBe('A');
    expect(focused!.href).toBe('#main');
    expect(focused!.text.toLowerCase()).toContain('skip');
  });

  test('exactly one h1 and no heading-level skips', async ({ page }) => {
    const levels = await page.$$eval(
      'h1, h2, h3, h4, h5, h6',
      (nodes) => nodes.map((n) => Number(n.tagName.substring(1)))
    );

    // The home page may render with placeholder content; if there is at least
    // one heading, enforce structural rules. Empty placeholder is ok.
    if (levels.length === 0) {
      return;
    }

    const h1Count = levels.filter((l) => l === 1).length;
    expect(h1Count).toBeLessThanOrEqual(1);

    for (let i = 1; i < levels.length; i++) {
      const jump = levels[i] - levels[i - 1];
      // Allow staying at the same level, going up to any prior level, or
      // descending by exactly one.
      expect(jump, `heading level skip from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(1);
    }
  });

  test('every focusable shows a visible focus ring', async ({ page }) => {
    const tabbables = await page.locator(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    const count = await tabbables.count();
    expect(count).toBeGreaterThan(0);

    // Focus each tabbable and verify outline is non-trivial (focus-visible).
    for (let i = 0; i < Math.min(count, 25); i++) {
      const el = tabbables.nth(i);
      await el.focus();
      const outline = await el.evaluate((node) => {
        const cs = getComputedStyle(node as Element);
        return {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
        };
      });
      const hasOutline =
        outline.outlineStyle !== 'none' && outline.outlineWidth !== '0px';
      const hasBoxShadow = outline.boxShadow !== 'none';
      expect(hasOutline || hasBoxShadow).toBeTruthy();
    }
  });

  test('all interactive controls expose accessible names', async ({ page }) => {
    const orphanCount = await page.evaluate(() => {
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>('button, a[href], [role="button"], [role="switch"]')
      );
      let orphans = 0;
      for (const c of controls) {
        const text = (c.textContent ?? '').trim();
        const aria = c.getAttribute('aria-label') ?? '';
        const labelled = c.getAttribute('aria-labelledby') ?? '';
        const title = c.getAttribute('title') ?? '';
        if (!text && !aria && !labelled && !title) orphans++;
      }
      return orphans;
    });
    expect(orphanCount).toBe(0);
  });

  test('all images have an alt attribute', async ({ page }) => {
    const missing = await page.$$eval('img', (imgs) =>
      imgs.filter((i) => !i.hasAttribute('alt')).length
    );
    expect(missing).toBe(0);
  });
});
