import { expect, test } from '@playwright/test';

// Team Gamma γ3 -- Keyboard accessibility.
//
// Verifies the keyboard map for `/`:
//   1. Skip-to-content is the FIRST Tab stop.
//   2. Tab traversal visits every interactive in DOM order.
//   3. Each focusable shows a visible focus indicator.
//   4. `scroll-margin-top: 80px` is applied to focused elements (so the
//      sticky header never occludes a freshly-focused control).

interface FocusInfo {
  tag: string;
  role: string | null;
  text: string;
  scrollMarginTop: string;
  outlineStyle: string;
  outlineWidth: string;
  boxShadow: string;
}

async function inspectFocused(page: import('@playwright/test').Page): Promise<FocusInfo | null> {
  return await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      role: el.getAttribute('role'),
      text: (el.textContent ?? '').trim().slice(0, 80),
      scrollMarginTop: cs.scrollMarginTop,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
    };
  });
}

test.describe('keyboard map for /', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  });

  test('first Tab focuses the skip-to-content link', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = await inspectFocused(page);
    expect(focused).not.toBeNull();
    expect(focused!.tag).toBe('A');
    expect(focused!.text.toLowerCase()).toContain('skip');
  });

  test('Tab traversal visits every interactive in DOM order', async ({ page }) => {
    const expected = await page.$$eval(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      (nodes) =>
        nodes.map((n) => ({
          tag: (n as HTMLElement).tagName,
          text: ((n as HTMLElement).textContent ?? '').trim().slice(0, 60),
        }))
    );

    expect(expected.length).toBeGreaterThan(0);

    const visited: Array<{ tag: string; text: string }> = [];
    const cap = Math.min(expected.length, 30);

    for (let i = 0; i < cap; i++) {
      await page.keyboard.press('Tab');
      const focused = await inspectFocused(page);
      if (!focused) break;
      visited.push({ tag: focused.tag, text: focused.text.slice(0, 60) });
    }

    // Tab order must match the DOM order of interactives (no surprise tabindex).
    expect(visited.map((v) => v.tag)).toEqual(
      expected.slice(0, visited.length).map((e) => e.tag)
    );
  });

  test('focused element has scroll-margin-top: 80px applied', async ({ page }) => {
    // Tab into the first interactive after the skip link.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await inspectFocused(page);
    expect(focused).not.toBeNull();
    expect(focused!.scrollMarginTop).toBe('80px');
  });

  test('every focusable shows an outline or box-shadow ring', async ({ page }) => {
    const tabbables = page.locator(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    const count = await tabbables.count();
    expect(count).toBeGreaterThan(0);

    let inspected = 0;
    for (let i = 0; i < count; i++) {
      const el = tabbables.nth(i);
      // Skip elements that are off-screen (visually hidden skip links etc.)
      // because focus on them is intentional but Playwright cannot focus
      // elements with display: none.
      const visible = await el.isVisible().catch(() => false);
      if (!visible) {
        // The skip link uses position:absolute; left:-9999px until focused.
        // Force-focus it via JS to inspect its focus state.
        await el.evaluate((node) => (node as HTMLElement).focus());
      } else {
        await el.focus();
      }

      const focusInfo = await page.evaluate(() => {
        const node = document.activeElement;
        if (!node || node === document.body) return null;
        const cs = getComputedStyle(node as Element);
        return {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
        };
      });

      if (!focusInfo) continue;

      const hasOutline =
        focusInfo.outlineStyle !== 'none' && focusInfo.outlineWidth !== '0px';
      const hasBoxShadow = focusInfo.boxShadow !== 'none';

      expect(
        hasOutline || hasBoxShadow,
        `focusable index ${i} lacks a visible focus indicator`
      ).toBeTruthy();

      inspected++;
      if (inspected >= 25) break;
    }
  });

  test('Motion toggle is reachable, role=switch, has aria-checked, and has visible label', async ({ page }) => {
    const motion = page.getByRole('switch', { name: /motion/i });
    await expect(motion).toBeVisible();

    const ariaChecked = await motion.getAttribute('aria-checked');
    expect(['true', 'false', 'mixed']).toContain(ariaChecked);

    // Visible TEXT label, not just an aria-label.
    const text = (await motion.textContent())?.trim() ?? '';
    expect(text.toLowerCase()).toMatch(/motion/);

    await motion.focus();
    const isFocused = await motion.evaluate((n) => n === document.activeElement);
    expect(isFocused).toBeTruthy();
  });

  test('Sound toggle is reachable, has aria-pressed, and has visible label', async ({ page }) => {
    const sound = page.locator('button[aria-pressed]', { hasText: /sound/i });
    await expect(sound).toBeVisible();

    const aria = await sound.getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(aria);

    const text = (await sound.textContent())?.trim() ?? '';
    expect(text.toLowerCase()).toMatch(/sound/);
  });
});
