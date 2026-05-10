#!/usr/bin/env node
/**
 * audit-a11y.mjs
 *
 * Static accessibility audit for mobile screens + components. Per Lens 9
 * (skills/mobile-council/lens-09-accessibility-auditor.md).
 *
 * Scans:
 *   mobile/app/**\/*.tsx
 *   mobile/src/**\/*.tsx
 *
 * Categories of finding:
 *
 *   1. INTERACTIVE-NO-LABEL: <Pressable> / <TouchableOpacity> /
 *      <TouchableHighlight> / <TouchableWithoutFeedback> JSX nodes
 *      without `accessibilityRole` AND `accessibilityLabel`.
 *      (Our custom Pressable already requires these, so the false-positive
 *      rate on the custom variant is low; but raw RN imports skip this.)
 *
 *   2. IMAGE-NO-LABEL: <Image> nodes without an explicit
 *      `accessibilityLabel` AND without `accessibilityElementsHidden`
 *      (decorative opt-out).
 *
 *   3. MODAL-NO-VIEW-IS-MODAL: <Modal> JSX without
 *      `accessibilityViewIsModal`. (Our custom Sheet/Modal primitives
 *      should set this; raw RN <Modal> use will trip.)
 *
 *   4. OFF-PALETTE-HEX: hex color literals (`#XXXXXX` or `#XXX`) in
 *      style props that don't appear in the design-system tokens. Warns
 *      so screens get caught using off-palette inline crimsons.
 *
 *   5. NO-MAX-FONT-SCALE: <Text> / <TextInput> nodes without
 *      `maxFontSizeMultiplier` AND without `allowFontScaling={false}`.
 *      (Soft warn; not all Text needs explicit caps if the Text primitive
 *      bakes them in. We only flag direct usage of the RN <Text> import.)
 *
 * Output: grouped by category, then by file. Exits non-zero on any HARD
 * finding. (1), (2), (3) are HARD; (4) and (5) are WARN.
 *
 * This is heuristic, not AST-based. False positives are expected; the
 * goal is to catch the common gaps that human eyes miss in code review.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['app', 'src'];
const SKIP_DIRS = new Set([
  'node_modules', '.expo', 'ios', 'android', 'dist', 'build', '.git',
]);
const EXTS = ['.tsx', '.jsx'];
const SELF = fileURLToPath(import.meta.url);

/* Load palette to drive OFF-PALETTE-HEX detection. ---------------------- */

function loadPalette() {
  const ds = join(ROOT, 'src/design-system/tokens/colors.ts');
  const legacy = join(ROOT, 'src/theme/tokens.ts');
  const seen = new Set();
  const sources = [];
  if (existsSync(ds)) sources.push(readFileSync(ds, 'utf8'));
  if (existsSync(legacy)) sources.push(readFileSync(legacy, 'utf8'));
  for (const src of sources) {
    const re = /#[0-9A-Fa-f]{3,8}\b/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      seen.add(m[0].toLowerCase());
    }
  }
  // Always allow pure black/white + transparent.
  seen.add('#000');
  seen.add('#000000');
  seen.add('#fff');
  seen.add('#ffffff');
  return seen;
}

const PALETTE = loadPalette();

/* Helpers. -------------------------------------------------------------- */

function* walk(dir) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && EXTS.some((x) => e.name.toLowerCase().endsWith(x))) yield full;
  }
}

function lineOf(src, idx) {
  return src.slice(0, idx).split(/\r?\n/).length;
}

/**
 * Extract every JSX element opening tag for a given component name. Returns
 * an array of {start, end, attrsText, line} where attrsText is the text
 * between `<Comp` and the matching `>` or `/>`.
 *
 * Naive: respects strings + does NOT recurse into nested generics. Good
 * enough for catching missing-prop cases.
 */
function findTags(src, compNames) {
  const out = [];
  const compAlt = compNames.join('|');
  const openRe = new RegExp(`<(${compAlt})\\b`, 'g');
  let m;
  while ((m = openRe.exec(src)) !== null) {
    const start = m.index;
    let i = m.index + m[0].length;
    let depth = 1;
    let inStr = null;
    let inBrace = 0;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (inStr) {
        if (ch === inStr && src[i - 1] !== '\\') inStr = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inStr = ch;
      } else if (ch === '{') {
        inBrace++;
      } else if (ch === '}') {
        if (inBrace > 0) inBrace--;
      } else if (inBrace === 0 && ch === '<') {
        depth++;
      } else if (inBrace === 0 && ch === '>') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    if (i < src.length) {
      const attrsText = src.slice(start + m[0].length, i);
      out.push({
        comp: m[1],
        start,
        end: i,
        attrsText,
        line: lineOf(src, start),
      });
    }
  }
  return out;
}

/** True if attrsText mentions a given prop name (regardless of value). */
function hasProp(attrsText, propName) {
  // Match `propName=` or `{...spread}` (assume spread carries it).
  if (new RegExp(`\\b${propName}\\s*=`).test(attrsText)) return true;
  if (/\{\s*\.\.\./.test(attrsText)) return true; // spread escape hatch
  return false;
}

/* Findings collector. --------------------------------------------------- */

/** @type {{cat:string,severity:'hard'|'warn',file:string,line:number,detail:string}[]} */
const findings = [];

function add(cat, severity, file, line, detail) {
  findings.push({ cat, severity, file, line, detail });
}

/* Scan loop. ------------------------------------------------------------ */

function importsRawRN(src, name) {
  // Accept `import { Pressable } from 'react-native'` etc.
  // For our purposes, if the file imports the RAW component from
  // 'react-native' (vs the wrapped primitive at our own paths), suspect.
  const re = new RegExp(`from\\s+['"]react-native['"]`);
  const importLines = src.match(/import[^;]+;/g) || [];
  for (const line of importLines) {
    if (re.test(line) && new RegExp(`\\b${name}\\b`).test(line)) return true;
  }
  return false;
}

function scanFile(file) {
  if (file === SELF) return;
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { return; }
  const rel = relative(ROOT, file).replace(/\\/g, '/');

  /* (1) INTERACTIVE-NO-LABEL.  Only flag when raw RN component is imported. */
  const rawTouchables = ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback'];
  const checkRaw = rawTouchables.filter((t) => importsRawRN(src, t));
  // For Pressable, also check raw RN import. Our custom Pressable lives at
  // ../components/Pressable and bakes role+label-required.
  if (importsRawRN(src, 'Pressable')) checkRaw.push('Pressable');

  if (checkRaw.length > 0) {
    const tags = findTags(src, checkRaw);
    for (const t of tags) {
      const hasRole = hasProp(t.attrsText, 'accessibilityRole');
      const hasLabel = hasProp(t.attrsText, 'accessibilityLabel');
      if (!hasRole || !hasLabel) {
        add('INTERACTIVE-NO-LABEL', 'hard', rel, t.line,
          `<${t.comp}> missing ${!hasRole ? 'accessibilityRole' : ''}${!hasRole && !hasLabel ? ' + ' : ''}${!hasLabel ? 'accessibilityLabel' : ''}`);
      }
    }
  }

  /* (2) IMAGE-NO-LABEL. Includes RN <Image> AND expo-image <Image>. */
  if (/\bImage\b/.test(src) && /from ['"](?:react-native|expo-image)['"]/.test(src)) {
    const tags = findTags(src, ['Image']);
    for (const t of tags) {
      const hasLabel = hasProp(t.attrsText, 'accessibilityLabel');
      const isHidden = hasProp(t.attrsText, 'accessibilityElementsHidden')
        || /accessible\s*=\s*\{\s*false\s*\}/.test(t.attrsText)
        || /importantForAccessibility\s*=\s*['"]no-?hide-?descendants['"]/.test(t.attrsText)
        || /importantForAccessibility\s*=\s*['"]no['"]/.test(t.attrsText);
      if (!hasLabel && !isHidden) {
        add('IMAGE-NO-LABEL', 'hard', rel, t.line,
          `<Image> missing accessibilityLabel (or mark accessibilityElementsHidden if decorative)`);
      }
    }
  }

  /* (3) MODAL-NO-VIEW-IS-MODAL. */
  if (/\bModal\b/.test(src) && /from ['"]react-native['"]/.test(src)) {
    const tags = findTags(src, ['Modal']);
    for (const t of tags) {
      if (!hasProp(t.attrsText, 'accessibilityViewIsModal')
          && !/onRequestClose/.test(t.attrsText) === false) {
        // Heuristic: only flag if the Modal lacks BOTH onRequestClose AND
        // accessibilityViewIsModal. onRequestClose alone covers Android
        // back, but iOS focus-trap still needs accessibilityViewIsModal.
        if (!hasProp(t.attrsText, 'accessibilityViewIsModal')) {
          add('MODAL-NO-VIEW-IS-MODAL', 'hard', rel, t.line,
            `<Modal> missing accessibilityViewIsModal`);
        }
      }
    }
  }

  /* (4) OFF-PALETTE-HEX. Surface hexes in style/className/Stylesheet. */
  // Match `#abcdef` or `#abc` literals inside JS strings. Skip the tokens
  // file itself + design-system files (they ARE the palette).
  if (!/src[\\/]design-system|src[\\/]theme[\\/]tokens/.test(rel)) {
    const re = /['"]?(#[0-9A-Fa-f]{3,8})['"]?/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const hex = m[1].toLowerCase();
      if (PALETTE.has(hex)) continue;
      // Skip source-map / hash-looking strings: only flag hexes that look
      // like real CSS colors (3 or 6 chars after #).
      const len = hex.length - 1;
      if (len !== 3 && len !== 6 && len !== 8) continue;
      const lineNo = lineOf(src, m.index);
      add('OFF-PALETTE-HEX', 'warn', rel, lineNo,
        `off-palette color literal ${hex} -- migrate to a design-system token`);
    }
  }

  /* (5) TEXT-NO-MAX-FONT-SCALE. Only when raw <Text> from 'react-native'. */
  if (importsRawRN(src, 'Text') || importsRawRN(src, 'TextInput')) {
    const targetComps = [];
    if (importsRawRN(src, 'Text')) targetComps.push('Text');
    if (importsRawRN(src, 'TextInput')) targetComps.push('TextInput');
    const tags = findTags(src, targetComps);
    for (const t of tags) {
      if (!hasProp(t.attrsText, 'maxFontSizeMultiplier')
          && !hasProp(t.attrsText, 'allowFontScaling')) {
        add('TEXT-NO-MAX-FONT-SCALE', 'warn', rel, t.line,
          `<${t.comp}> missing maxFontSizeMultiplier (Lens 9: cap per variant)`);
      }
    }
  }
}

/* Run. ------------------------------------------------------------------ */

const files = [];
for (const d of SCAN_DIRS) {
  for (const f of walk(join(ROOT, d))) files.push(f);
}
for (const f of files) scanFile(f);

const hard = findings.filter((f) => f.severity === 'hard');
const warn = findings.filter((f) => f.severity === 'warn');

console.log(`audit-a11y: scanned ${files.length} files`);
console.log(`audit-a11y: ${hard.length} HARD, ${warn.length} WARN`);
console.log('');

function group(list, label) {
  if (list.length === 0) return;
  console.log(`${label}:`);
  const byCat = new Map();
  for (const f of list) {
    if (!byCat.has(f.cat)) byCat.set(f.cat, []);
    byCat.get(f.cat).push(f);
  }
  for (const [cat, items] of byCat) {
    console.log(`  [${cat}] (${items.length})`);
    const byFile = new Map();
    for (const it of items) {
      if (!byFile.has(it.file)) byFile.set(it.file, []);
      byFile.get(it.file).push(it);
    }
    for (const [file, fileItems] of byFile) {
      console.log(`    ${file}`);
      for (const it of fileItems.slice(0, 8)) {
        console.log(`      ${it.line}  ${it.detail}`);
      }
      if (fileItems.length > 8) console.log(`      ... (${fileItems.length - 8} more)`);
    }
  }
  console.log('');
}

group(hard, 'HARD findings (must fix)');
group(warn, 'WARN findings (review)');

if (hard.length > 0) {
  console.error('audit-a11y: FAIL');
  console.error('Per Lens 9: every interactive surface needs role+label; modals need accessibilityViewIsModal; images need labels or be marked decorative.');
  process.exit(1);
}

console.log('audit-a11y: OK');
process.exit(0);
