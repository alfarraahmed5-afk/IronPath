#!/usr/bin/env node
/**
 * audit-rtl.mjs
 *
 * RTL (Arabic locale) safety audit. Per Lens 9 + Synthesis #86:
 *
 *   - Default RN flips `flexDirection: 'row'` automatically when
 *     I18nManager.isRTL=true. So plain `'row'` is fine.
 *   - But `marginLeft`/`marginRight`/`paddingLeft`/`paddingRight`/
 *     `left`/`right` do NOT auto-flip. These should migrate to
 *     `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd`/`start`/`end`.
 *   - Hardcoded `flexDirection: 'row-reverse'` is a smell -- usually means
 *     the author was working around something. Prefer `'row'` + logical
 *     properties.
 *   - `textAlign: 'left'` / `textAlign: 'right'` should migrate to
 *     `textAlign: 'start'` / `textAlign: 'end'`. (RN supports these on
 *     0.75+.)
 *
 * Output: groups hits by category. Exits non-zero if any DIRECTIONAL hits
 * exist in mobile/app or mobile/src .tsx files. (`'row'` itself is OK; we
 * only flag the LEFT/RIGHT properties that don't auto-flip.)
 *
 * Whitelist: this script self-excludes. Tokens files (spacing.ts) are
 * symmetric and skipped.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['app', 'src'];
const SCAN_FILE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.expo',
  'ios',
  'android',
  'dist',
  'build',
  '.git',
]);
const SKIP_FILE_BASENAMES = new Set([
  // Tokens / config files that legitimately reference symmetric values.
  'spacing.ts',
  'radii.ts',
  'shadows.ts',
]);

const SELF_PATH = fileURLToPath(import.meta.url);

/** Patterns to flag, ordered most-specific first. */
const PATTERNS = [
  { name: 'marginLeft',  re: /\bmarginLeft\s*:/g,  fix: 'use marginStart' },
  { name: 'marginRight', re: /\bmarginRight\s*:/g, fix: 'use marginEnd' },
  { name: 'paddingLeft', re: /\bpaddingLeft\s*:/g, fix: 'use paddingStart' },
  { name: 'paddingRight',re: /\bpaddingRight\s*:/g,fix: 'use paddingEnd' },
  // `left:` / `right:` are tricky -- they can refer to absolute positioning
  // legitimately. We surface them at INFO level (does not fail) so the
  // integration audit can manually triage.
  { name: 'left',  re: /^[\s]*left\s*:\s*[0-9]/gm,  fix: 'review: prefer start: for RTL', soft: true },
  { name: 'right', re: /^[\s]*right\s*:\s*[0-9]/gm, fix: 'review: prefer end: for RTL', soft: true },
  { name: "textAlign:'left'",  re: /textAlign\s*:\s*['"]left['"]/g,  fix: "use 'start'" },
  { name: "textAlign:'right'", re: /textAlign\s*:\s*['"]right['"]/g, fix: "use 'end'" },
  // row-reverse: legitimate occasionally; flagged at WARN.
  { name: "flexDirection:'row-reverse'", re: /flexDirection\s*:\s*['"]row-reverse['"]/g, fix: 'verify intentional under RTL', soft: true },
];

/** @type {{file:string,line:number,what:string,fix:string,soft:boolean,snippet:string}[]} */
const hits = [];

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch { return; }
  for (const ent of entries) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, out);
    } else if (ent.isFile()) {
      const lower = ent.name.toLowerCase();
      if (SKIP_FILE_BASENAMES.has(ent.name)) continue;
      if (SCAN_FILE_EXTS.some((ext) => lower.endsWith(ext))) {
        out.push(full);
      }
    }
  }
}

function scanFile(file) {
  if (file === SELF_PATH) return;
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { return; }
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(content)) !== null) {
      const beforeMatch = content.slice(0, m.index);
      const lineNo = beforeMatch.split(/\r?\n/).length;
      const lineStart = content.lastIndexOf('\n', m.index) + 1;
      const lineEnd = content.indexOf('\n', m.index);
      const snippet = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd).trim().slice(0, 140);
      hits.push({
        file: relative(ROOT, file).replace(/\\/g, '/'),
        line: lineNo,
        what: p.name,
        fix: p.fix,
        soft: !!p.soft,
        snippet,
      });
    }
  }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
for (const f of files) scanFile(f);

const hard = hits.filter((h) => !h.soft);
const soft = hits.filter((h) => h.soft);

if (hits.length === 0) {
  console.log(`audit-rtl: OK (${files.length} files scanned, 0 hits)`);
  process.exit(0);
}

console.log(`audit-rtl: ${hard.length} HARD hit(s), ${soft.length} SOFT hit(s) in ${files.length} files`);
console.log('');

function group(list, label) {
  if (list.length === 0) return;
  console.log(`${label}:`);
  const byFile = new Map();
  for (const h of list) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }
  for (const [file, items] of byFile) {
    console.log(`  ${file}`);
    for (const h of items) {
      console.log(`    ${h.line}  [${h.what}] -> ${h.fix}`);
      console.log(`         ${h.snippet}`);
    }
  }
  console.log('');
}

group(hard, 'HARD (must fix for RTL)');
group(soft, 'SOFT (review under Arabic locale)');

if (hard.length > 0) {
  console.error('audit-rtl: FAIL -- migrate marginLeft/Right + paddingLeft/Right + textAlign left/right to logical properties.');
  process.exit(1);
}

console.log('audit-rtl: OK (no hard failures; soft hits documented above)');
process.exit(0);
