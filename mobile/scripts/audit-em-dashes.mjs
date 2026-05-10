#!/usr/bin/env node
/**
 * audit-em-dashes.mjs
 *
 * Founder rule: NO em dashes anywhere in the mobile app source.
 * Use double-hyphen `--` instead. Em dashes (U+2014) and the HTML entity
 * `&mdash;` are both banned.
 *
 * Scans:
 *   mobile/app/**\/*.{ts,tsx,js,jsx}
 *   mobile/src/**\/*.{ts,tsx,js,jsx}
 *   mobile/scripts/**\/*.{ts,tsx,js,jsx,mjs,cjs}
 *   mobile/docs/**\/*.md
 *   mobile/*.{ts,tsx,js,jsx,json}
 *
 * Skips:
 *   - node_modules
 *   - .expo
 *   - ios / android (auto-generated native projects)
 *
 * Exits non-zero on any hit. CI-friendly: minimal output on success,
 * grouped output on failure.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const SCAN_DIRS = ['app', 'src', 'scripts', 'docs'];
const SCAN_FILE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.json'];
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.expo',
  'ios',
  'android',
  'dist',
  'build',
  '.git',
]);

// U+2014 EM DASH, U+2013 EN DASH (we treat both as suspect; en-dash is rare
// but founder-banned same as em-dash for ascii-only output).
// Build the patterns from char codes so this very script doesn't trip itself.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BANNED_PATTERNS = [
  { name: 'em dash (U+2014)', pattern: EM_DASH },
  { name: 'en dash (U+2013)', pattern: EN_DASH },
  { name: 'mdash entity',     pattern: '&' + 'mdash;' },
  { name: 'ndash entity',     pattern: '&' + 'ndash;' },
];

// Skip this very script when scanning -- it intentionally references the
// banned characters in source.
const SELF_PATH = fileURLToPath(import.meta.url);

/** @type {{file:string,line:number,col:number,what:string,snippet:string}[]} */
const hits = [];

/** Recursively walk a directory; collect file paths that match SCAN_FILE_EXTS. */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full, out);
    } else if (ent.isFile()) {
      const lower = ent.name.toLowerCase();
      if (SCAN_FILE_EXTS.some((ext) => lower.endsWith(ext))) {
        out.push(full);
      }
    }
  }
}

function scanFile(file) {
  if (file === SELF_PATH) return;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { name, pattern } of BANNED_PATTERNS) {
      const idx = line.indexOf(pattern);
      if (idx !== -1) {
        hits.push({
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          col: idx + 1,
          what: name,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  });
}

const files = [];
for (const d of SCAN_DIRS) {
  walk(join(ROOT, d), files);
}
// Top-level files (package.json etc.)
try {
  for (const ent of readdirSync(ROOT, { withFileTypes: true })) {
    if (ent.isFile()) {
      const lower = ent.name.toLowerCase();
      if (SCAN_FILE_EXTS.some((ext) => lower.endsWith(ext))) {
        files.push(join(ROOT, ent.name));
      }
    }
  }
} catch {}

for (const f of files) scanFile(f);

if (hits.length === 0) {
  console.log(`audit-em-dashes: OK (${files.length} files scanned, 0 hits)`);
  process.exit(0);
}

console.error(`audit-em-dashes: FAIL (${hits.length} hit(s) in ${files.length} files scanned)`);
console.error('');
const byFile = new Map();
for (const h of hits) {
  if (!byFile.has(h.file)) byFile.set(h.file, []);
  byFile.get(h.file).push(h);
}
for (const [file, list] of byFile) {
  console.error(`  ${file}`);
  for (const h of list) {
    console.error(`    ${h.line}:${h.col}  [${h.what}]  ${h.snippet}`);
  }
}
console.error('');
console.error('Founder rule: replace every em/en dash with `--` (double-hyphen).');
process.exit(1);
