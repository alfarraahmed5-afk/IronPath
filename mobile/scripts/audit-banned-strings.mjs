#!/usr/bin/env node
/**
 * audit-banned-strings.mjs
 *
 * Founder-banned strings that must not appear in mobile/ source outside
 * of `docs/archive/`:
 *
 *   - "Mindbody"      // legacy gym software competitor name
 *   - "Glofox"        // legacy gym software competitor name
 *   - "cal.com"       // banned scheduling tool reference
 *   - "Cal.com"       // case variant
 *   - "ironpath.app"  // wrong domain (must be ironpath.health)
 *
 * Allowed exceptions:
 *   - `mobile/docs/archive/**`  (kept for historical reference)
 *   - `mobile/scripts/audit-banned-strings.mjs` itself (this very file)
 *
 * Exits non-zero on any hit. The first invocation against current master
 * may surface legacy hits; document them in docs/A11Y_CHECKLIST.md and
 * fix in the integration sprint.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const SCAN_DIRS = ['app', 'src', 'scripts', 'docs'];
const SCAN_FILE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.json', '.html'];
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.expo',
  'ios',
  'android',
  'dist',
  'build',
  '.git',
  'archive',
]);

const BANNED = [
  { needle: 'Mindbody',     why: 'competitor name' },
  { needle: 'mindbody',     why: 'competitor name (lowercase)' },
  { needle: 'Glofox',       why: 'competitor name' },
  { needle: 'glofox',       why: 'competitor name (lowercase)' },
  { needle: 'cal.com',      why: 'banned scheduling tool' },
  { needle: 'Cal.com',      why: 'banned scheduling tool' },
  { needle: 'ironpath.app', why: 'wrong domain (use ironpath.health)' },
];

const SELF_PATH = fileURLToPath(import.meta.url);

/**
 * Files that are allowed to mention banned strings because they DOCUMENT the
 * ban rather than violate it. Keep this list tight; every entry is a hand
 * audit.
 */
const DOC_ALLOWLIST = new Set([
  // Manual a11y release checklist explains what the ban catches.
  'docs/A11Y_CHECKLIST.md',
]);

/** @type {{file:string,line:number,col:number,needle:string,why:string,snippet:string}[]} */
const hits = [];

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
  if (file === SELF_PATH) return; // never flag this script itself
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (DOC_ALLOWLIST.has(rel)) return;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { needle, why } of BANNED) {
      const idx = line.indexOf(needle);
      if (idx !== -1) {
        hits.push({
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          col: idx + 1,
          needle,
          why,
          snippet: line.trim().slice(0, 140),
        });
      }
    }
  });
}

const files = [];
for (const d of SCAN_DIRS) {
  walk(join(ROOT, d), files);
}
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
  console.log(`audit-banned-strings: OK (${files.length} files scanned, 0 hits)`);
  process.exit(0);
}

console.error(`audit-banned-strings: FAIL (${hits.length} hit(s) in ${files.length} files scanned)`);
console.error('');
const byFile = new Map();
for (const h of hits) {
  if (!byFile.has(h.file)) byFile.set(h.file, []);
  byFile.get(h.file).push(h);
}
for (const [file, list] of byFile) {
  console.error(`  ${file}`);
  for (const h of list) {
    console.error(`    ${h.line}:${h.col}  [${h.needle}] (${h.why})  ${h.snippet}`);
  }
}
console.error('');
console.error('If a legacy hit is intentionally preserved, move it into mobile/docs/archive/.');
process.exit(1);
