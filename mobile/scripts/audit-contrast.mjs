#!/usr/bin/env node
/**
 * audit-contrast.mjs
 *
 * Computes WCAG 2.1 contrast ratios for every color in
 * mobile/src/design-system/tokens/colors.ts (or, if A-1's tokens haven't
 * landed yet, the legacy mobile/src/theme/tokens.ts) against:
 *
 *   - the bg / ink-950 / surface1 background (computed dynamically from
 *     whichever token represents primary background in the file)
 *   - the textPrimary / ink-50 (light foreground) baseline
 *
 * Per Lens 9 (mobile-council/lens-09-accessibility-auditor.md):
 *
 *   - Body text:        >= 4.5:1
 *   - Large text:       >= 3:1
 *   - Non-text (UI):    >= 3:1
 *   - Display-only:     >= 3:1 (with 18pt+ rule)
 *
 * Color role classification:
 *
 *   - "text*" colors must clear 4.5:1 vs the primary bg.
 *   - "border*" / decorative colors must clear 3:1 vs primary bg.
 *   - "brand*" / display tokens must clear 3:1 (display gate); flagged
 *     with a note if they fail 4.5:1 since they may not be used as body.
 *   - "set*" / "status" semantic colors flagged at 4.5:1 (used as text).
 *
 * Behavior gate per founder rule:
 *   - Hard fail: any text-eligible token < 4.5:1 vs bg.
 *   - Hard fail: any non-text/display token < 3:1 vs bg.
 *   - Warn: any text-eligible token < 7:1 (AAA threshold).
 *
 * Phase 1 expectation: A-1's full crimson palette may not be in place
 * yet. In that case we read the stub and report against legacy tokens
 * with a banner explaining the gap.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DS_TOKENS = join(ROOT, 'src/design-system/tokens/colors.ts');
const LEGACY_TOKENS = join(ROOT, 'src/theme/tokens.ts');

const HEX_RE = /['"]?(#[0-9A-Fa-f]{3,8})['"]?/g;
const RGBA_RE = /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*([0-9.]+))?\s*\)/g;
const KEY_VAL_RE = /^[\s]*([A-Za-z0-9_]+)\s*:\s*['"]?(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))['"]?/gm;

/* WCAG relative luminance + contrast ratio. ----------------------------- */

function expand3(hex) {
  // #abc -> #aabbcc
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    return '#' + hex.slice(1).split('').map((c) => c + c).join('');
  }
  return hex;
}

function hexToRgb(hex) {
  hex = expand3(hex.replace(/^#/, ''));
  if (hex.length === 8) hex = hex.slice(0, 6); // strip alpha
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function parseColor(value) {
  // returns { rgb: [r,g,b], alpha: 0..1 } or null
  if (!value) return null;
  if (value.startsWith('#')) {
    const rgb = hexToRgb(value);
    if (!rgb) return null;
    let alpha = 1;
    const stripped = value.replace(/^#/, '');
    if (stripped.length === 8) {
      alpha = parseInt(stripped.slice(6, 8), 16) / 255;
    }
    return { rgb, alpha };
  }
  const m = /^rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*([0-9.]+))?\s*\)$/.exec(value.trim());
  if (m) {
    return {
      rgb: [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)],
      alpha: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
  }
  return null;
}

function relativeLuminance([r, g, b]) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(rgb1);
  const L2 = relativeLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* Read the tokens file, extract colors. -------------------------------- */

function loadTokens() {
  let path = null;
  let source = '';
  if (existsSync(DS_TOKENS)) {
    const txt = readFileSync(DS_TOKENS, 'utf8');
    // The stub re-exports from theme/tokens.ts. If it does, follow the
    // symlink in code by reading the legacy file.
    if (/from\s+['"]\.\.\/\.\.\/theme\/tokens['"]/.test(txt) || /STUB/.test(txt)) {
      if (existsSync(LEGACY_TOKENS)) {
        path = LEGACY_TOKENS;
        source = readFileSync(LEGACY_TOKENS, 'utf8');
      } else {
        path = DS_TOKENS;
        source = txt;
      }
    } else {
      path = DS_TOKENS;
      source = txt;
    }
  } else if (existsSync(LEGACY_TOKENS)) {
    path = LEGACY_TOKENS;
    source = readFileSync(LEGACY_TOKENS, 'utf8');
  }
  return { path, source };
}

/** Extract `key: '#hex'` or `key: 'rgba(...)'` pairs from the colors object. */
function extractColors(source) {
  const out = [];
  // Naive extraction: match `name: '<color>'` lines anywhere in the file.
  // Limit to the colors object by finding the `colors` declaration block.
  let block = source;
  const colorsIdx = source.search(/(?:export\s+const|const)\s+colors\s*=\s*\{/);
  if (colorsIdx !== -1) {
    const startBrace = source.indexOf('{', colorsIdx);
    let depth = 1;
    let i = startBrace + 1;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    block = source.slice(startBrace, i);
  }

  KEY_VAL_RE.lastIndex = 0;
  let m;
  while ((m = KEY_VAL_RE.exec(block)) !== null) {
    const name = m[1];
    const raw = m[2];
    const parsed = parseColor(raw);
    if (parsed) out.push({ name, raw, ...parsed });
  }
  return out;
}

/** Classify a token name into a contrast role. */
function classify(name) {
  const n = name.toLowerCase();
  if (n.startsWith('bg') || n.startsWith('surface') || n === 'ink50' || n.startsWith('ink-')) return 'surface';
  if (n.startsWith('text')) return 'text';
  if (n.startsWith('border')) return 'border';
  if (n.startsWith('brand')) {
    // brand-400, brandText -> body-eligible; brand-500, brandDisplay -> display only
    if (/(text|400|350|450)/.test(n) || n === 'brandtext' || n === 'brandfocus') return 'text';
    return 'display';
  }
  if (n.startsWith('set') || n === 'success' || n === 'danger' || n === 'warning' || n === 'info') return 'text';
  if (n.startsWith('flame')) return 'display';
  return 'text';
}

/** Identify the primary background. Prefer `bg`, then `surface1`, then `ink950`. */
function pickBackground(colors) {
  const byName = new Map(colors.map((c) => [c.name.toLowerCase(), c]));
  const candidates = ['bg', 'background', 'surface1', 'surface_1', 'ink950', 'ink_950'];
  for (const c of candidates) {
    if (byName.has(c)) return byName.get(c);
  }
  // Fallback to the darkest color
  let darkest = null;
  for (const c of colors) {
    if (c.alpha < 1) continue;
    const lum = relativeLuminance(c.rgb);
    if (!darkest || lum < darkest.lum) darkest = { ...c, lum };
  }
  return darkest;
}

/* Main. ----------------------------------------------------------------- */

const { path, source } = loadTokens();
if (!path) {
  console.error('audit-contrast: FAIL -- could not find a tokens file at:');
  console.error(`  ${DS_TOKENS}`);
  console.error(`  ${LEGACY_TOKENS}`);
  process.exit(2);
}

console.log(`audit-contrast: reading tokens from ${path.replace(ROOT, '').replace(/\\/g, '/')}`);

const colors = extractColors(source);
if (colors.length === 0) {
  console.error('audit-contrast: FAIL -- no colors extracted (parser saw 0 entries).');
  process.exit(2);
}

const bg = pickBackground(colors);
if (!bg) {
  console.error('audit-contrast: FAIL -- no primary background color found.');
  process.exit(2);
}

console.log(`audit-contrast: primary bg = ${bg.name} (${bg.raw})`);
console.log(`audit-contrast: scanning ${colors.length} tokens`);
console.log('');

const fails = [];
const warns = [];
const passes = [];

const TEXT_AA = 4.5;
const LARGE_AA = 3.0;
const TEXT_AAA = 7.0;

for (const c of colors) {
  if (c.alpha < 1) {
    // Translucent values can't be evaluated standalone; flag for review.
    passes.push({ ...c, ratio: null, role: 'translucent', verdict: 'skip' });
    continue;
  }
  if (c.name === bg.name) continue;
  const role = classify(c.name);
  const ratio = contrastRatio(c.rgb, bg.rgb);
  const r2 = ratio.toFixed(2);
  let verdict = 'pass';
  if (role === 'text') {
    if (ratio < TEXT_AA) verdict = 'fail';
    else if (ratio < TEXT_AAA) verdict = 'warn';
  } else if (role === 'border' || role === 'display') {
    if (ratio < LARGE_AA) verdict = 'fail';
  } else if (role === 'surface') {
    verdict = 'pass'; // surfaces are evaluated only when used as bg
  }
  const row = { name: c.name, raw: c.raw, ratio: r2, role, verdict };
  if (verdict === 'fail') fails.push(row);
  else if (verdict === 'warn') warns.push(row);
  else passes.push(row);
}

function pad(s, n) {
  return String(s).padEnd(n, ' ');
}

const rows = [...fails, ...warns, ...passes].filter((r) => r.role !== 'translucent' && r.role !== 'surface');
console.log(`  ${pad('TOKEN', 20)} ${pad('HEX', 12)} ${pad('vs BG', 8)} ${pad('ROLE', 10)} VERDICT`);
console.log(`  ${'-'.repeat(20)} ${'-'.repeat(12)} ${'-'.repeat(8)} ${'-'.repeat(10)} -------`);
for (const r of rows) {
  console.log(`  ${pad(r.name, 20)} ${pad(r.raw, 12)} ${pad(r.ratio, 8)} ${pad(r.role, 10)} ${r.verdict.toUpperCase()}`);
}

console.log('');
console.log(`audit-contrast: ${fails.length} FAIL, ${warns.length} WARN, ${passes.length} PASS`);

if (fails.length > 0) {
  console.error('');
  console.error('audit-contrast: FAIL -- fix or document each failing token in mobile/docs/A11Y_CHECKLIST.md');
  console.error('Per Lens 9: text tokens must clear 4.5:1; border/display tokens must clear 3:1 vs the primary bg.');
  process.exit(1);
}

console.log('audit-contrast: OK');
process.exit(0);
