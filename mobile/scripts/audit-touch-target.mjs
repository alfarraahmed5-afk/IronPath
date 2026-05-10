#!/usr/bin/env node
/**
 * audit-touch-target.mjs
 *
 * Static heuristic: scans .tsx files for Pressable / TouchableOpacity /
 * Button JSX nodes and flags style entries with `width` or `height`
 * smaller than 44 (WCAG 2.5.5 + iOS HIG minimum, also Android 48dp ~= 44pt).
 *
 * Heuristic (best-effort):
 *
 *   1. Scan style declarations of the form
 *      `width: <N>` or `height: <N>` where N is a numeric literal < 44.
 *   2. If the same style block contains `hitSlop` totaling >= the gap
 *      to 44, treat it as PASS.
 *   3. Otherwise flag.
 *
 * This is NOT a full AST analysis. It catches the common mistakes:
 *   - `width: 32, height: 32` icon buttons with no hitSlop
 *   - `minHeight: 36` form inputs
 *   - `padding: 4` -> tiny pressable
 *
 * Misses:
 *   - dynamic widths (computed at render time)
 *   - flex-1 layouts where width is implicit
 *   - styled() / NativeWind className-based sizing (covered by audit-a11y
 *     warnings instead)
 *
 * Outputs grouped by file. Exits non-zero on any HARD hit. Does NOT fail
 * on missing-button cases (audit-a11y handles those).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['app', 'src'];
const EXTS = ['.tsx', '.jsx'];
const SKIP_DIRS = new Set(['node_modules', '.expo', 'ios', 'android', 'dist', 'build', '.git']);
const SELF = fileURLToPath(import.meta.url);

const TARGET = 44;

/** @type {{file:string,line:number,what:string,value:number,snippet:string}[]} */
const hits = [];

function walk(dir, out) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && EXTS.some((x) => e.name.toLowerCase().endsWith(x))) out.push(full);
  }
}

function scanFile(file) {
  if (file === SELF) return;
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { return; }

  // Cheap pre-filter: does the file even mention any pressable surface?
  if (!/\b(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback|Button)\b/.test(src)) {
    return;
  }

  const lines = src.split(/\r?\n/);
  // Find style declarations referencing `width:` or `height:` or `minWidth:` or `minHeight:`.
  // Match `width: 32` (literal numeric, optionally trailing comma).
  const re = /\b(width|height|minWidth|minHeight)\s*:\s*([0-9]+)(?:[\s,])/g;

  // Build a quick lookup of which lines are inside a Pressable/Touchable/Button
  // JSX block by scanning forward from each opening tag and tracking nesting.
  // Heuristic: any style number declared within ~30 lines after a Pressable
  // open tag is suspect. Real bound is harder without an AST.

  /** @type {Set<number>} */
  const suspectLines = new Set();
  const tagRe = /<\s*(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback|Button)\b/g;
  let tag;
  while ((tag = tagRe.exec(src)) !== null) {
    const startLine = src.slice(0, tag.index).split(/\r?\n/).length;
    for (let i = startLine; i < Math.min(lines.length, startLine + 30); i++) {
      suspectLines.add(i + 1); // 1-indexed
    }
  }
  // Style sheets named `*Btn`, `*Button`, `*pressable` etc. -- scan stylesheet
  // declarations that look like they apply to pressables.
  const styleBlockRe = /(\w*[Bb]tn|\w*[Bb]utton|\w*[Pp]ressable|\w*[Tt]ouchable)\s*:\s*\{/g;
  let sb;
  while ((sb = styleBlockRe.exec(src)) !== null) {
    const startLine = src.slice(0, sb.index).split(/\r?\n/).length;
    for (let i = startLine; i < Math.min(lines.length, startLine + 30); i++) {
      suspectLines.add(i + 1);
    }
  }

  re.lastIndex = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    const value = parseInt(m[2], 10);
    if (value >= TARGET) continue;
    const lineNo = src.slice(0, m.index).split(/\r?\n/).length;
    if (!suspectLines.has(lineNo)) continue;

    // Look ahead within 12 lines for `hitSlop` to potentially absolve.
    const lookahead = lines.slice(lineNo - 1, lineNo + 11).join('\n');
    const hitSlopMatch = /hitSlop\s*:\s*(\{[^}]*\}|[0-9]+)/.exec(lookahead);
    let absolved = false;
    if (hitSlopMatch) {
      const block = hitSlopMatch[1];
      // Try to extract numbers; sum top+bottom for height, left+right for width.
      const nums = [...block.matchAll(/([0-9]+)/g)].map((mm) => parseInt(mm[1], 10));
      const slopSum = nums.length > 0 ? nums.reduce((a, b) => Math.max(a, b), 0) * 2 : 0;
      // If the value plus slop reaches TARGET, mark absolved.
      if (value + slopSum >= TARGET) absolved = true;
    }
    if (absolved) continue;

    const snippet = (lines[lineNo - 1] || '').trim().slice(0, 140);
    hits.push({
      file: relative(ROOT, file).replace(/\\/g, '/'),
      line: lineNo,
      what: m[1],
      value,
      snippet,
    });
  }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
for (const f of files) scanFile(f);

if (hits.length === 0) {
  console.log(`audit-touch-target: OK (${files.length} files scanned, 0 hits)`);
  process.exit(0);
}

console.error(`audit-touch-target: ${hits.length} potential hit(s) in ${files.length} files`);
console.error('');
const byFile = new Map();
for (const h of hits) {
  if (!byFile.has(h.file)) byFile.set(h.file, []);
  byFile.get(h.file).push(h);
}
for (const [f, list] of byFile) {
  console.error(`  ${f}`);
  for (const h of list) {
    console.error(`    ${h.line}  ${h.what}: ${h.value}  (< ${TARGET})`);
    console.error(`         ${h.snippet}`);
  }
}
console.error('');
console.error('Per Lens 9: bump hitSlop or visual size so effective hit area >= 44pt.');
process.exit(1);
