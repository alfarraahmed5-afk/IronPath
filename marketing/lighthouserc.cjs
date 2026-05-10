// Team Gamma γ3 — Lighthouse CI configuration.
//
// Two configurations are exported under one config: the default run plus a
// reduced-motion run. The CI workflow invokes `lhci autorun` once per
// `LHCI_CONFIG` mode so we get green-or-red signals on BOTH motion paths.
//
// Mode selection: set `LHCI_MODE=reduced` to flip the chrome flags + emulation
// metrics. Default mode keeps the standard mobile preset.

const isReduced = process.env.LHCI_MODE === 'reduced';

const PORT = process.env.MARKETING_PORT ?? '5175';
const BASE = process.env.MARKETING_BASE_URL ?? `http://127.0.0.1:${PORT}`;

const sharedSettings = {
  preset: 'desktop',
  // `--force-prefers-reduced-motion` ships in Chrome 105+; lhci passes flags
  // through to chrome via `chromeFlags`.
  chromeFlags: isReduced
    ? '--force-prefers-reduced-motion --no-sandbox'
    : '--no-sandbox',
  // Run a few iterations and use the median so flaky paint timings don't
  // ratchet the CI gate.
  numberOfRuns: 3,
  // Lighthouse `emulatedFormFactor` desktop preset is enough; we keep the
  // default network throttling.
  skipAudits: ['uses-http2', 'redirects-http'],
};

module.exports = {
  ci: {
    collect: {
      url: [
        `${BASE}/`,
        `${BASE}/pricing`,
        `${BASE}/blog`,
      ],
      startServerCommand: process.env.LHCI_START_COMMAND ?? 'npm run -w marketing dev',
      startServerReadyPattern: 'started server on',
      startServerReadyTimeout: 180_000,
      settings: sharedSettings,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        // Performance budgets per the platform plan.
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Web vitals — hard caps per Phase C spec.
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],

        // Accessibility audits we never want to regress on.
        'color-contrast': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        tabindex: 'error',
        'focus-traps': 'warn',
        'focusable-controls': 'warn',

        // Allow some audits to be informational (don't fail the build).
        'unused-javascript': 'off',
        'unused-css-rules': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
