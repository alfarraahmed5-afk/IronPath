// Read-only helper: emits skills/exercise-cleanup/SUGGESTED-CLEANUP.sql.
// EVERY statement is commented out so nothing executes. Founder uncomments
// selectively after eyeballing FK exposure on each row.

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../../skills/exercise-cleanup');
const inv = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'inventory.json'), 'utf8'));

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEEP_LOWER = new Set(['a','an','and','as','at','by','for','in','of','on','or','the','to','with']);
const KEEP_UPPER = new Set(['RDL','KB','DB','BB','EZ','TRX','AMRAP']);

function titleCase(s) {
  if (!s) return s;
  return s.split(/\s+/).map((word, i) => {
    const lower = word.toLowerCase();
    const upper = word.toUpperCase();
    if (KEEP_UPPER.has(upper)) return upper;
    if (i > 0 && KEEP_LOWER.has(lower)) return lower;
    if (word.includes('-')) {
      return word.split('-').map(p => {
        const pu = p.toUpperCase();
        if (KEEP_UPPER.has(pu)) return pu;
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      }).join('-');
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function proposeRename(name) {
  if (!name) return name;
  let n = name;
  n = n.replace(/[–—]/g, '-');
  n = n.replace(/\s*\(\s*(RDL|NB|R|L|right|left|short|long|s|l)\s*\)\s*/gi, ' ');
  n = n.replace(/,?\s+(left|right)\b/gi, '');
  n = n.replace(/\s+/g, ' ').trim();
  n = n.replace(/\bpush ups?\b/gi, 'Push-Up');
  n = n.replace(/\bpushups?\b/gi, 'Push-Up');
  n = n.replace(/\bpull ups?\b/gi, 'Pull-Up');
  n = n.replace(/\bpullups?\b/gi, 'Pull-Up');
  n = n.replace(/\bchin ups?\b/gi, 'Chin-Up');
  n = n.replace(/\bsit ups?\b/gi, 'Sit-Up');
  n = titleCase(n);
  n = n.replace(/\bPush-up\b/g, 'Push-Up');
  n = n.replace(/\bPull-up\b/g, 'Pull-Up');
  n = n.replace(/\bChin-up\b/g, 'Chin-Up');
  n = n.replace(/\bSit-up\b/g, 'Sit-Up');
  return n;
}

function hasWeirdFormatting(name) {
  if (!name) return false;
  if (/[^\x20-\x7E]/.test(name)) return true;
  if (/\s+(left|right)\b/i.test(name)) return true;
  if (/\(\s*(RDL|NB|R|L)\s*\)/i.test(name)) return true;
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words.some((w, i) => i > 0 && /^[a-z]/.test(w) && !KEEP_LOWER.has(w.toLowerCase()))) return true;
  if (/^[a-z]/.test(name.trim())) return true;
  return false;
}

// Group dupes
function pickCanonical(list) {
  function score(r) {
    let s = 0;
    if (r.image_url) s += 4;
    if (r.wger_id != null) s += 2;
    if (Array.isArray(r.primary_muscles) && r.primary_muscles.length > 0) s += 1;
    if (r.name && /^[A-Z]/.test(r.name.trim())) s += 1;
    if (r.name && !/\b(left|right)\b/i.test(r.name) && !/\(/.test(r.name)) s += 1;
    return s;
  }
  return [...list].sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    return (a.wger_id ?? 1e9) - (b.wger_id ?? 1e9);
  })[0];
}

const byNorm = new Map();
for (const r of inv) {
  const k = normalizeName(r.name);
  if (!k) continue;
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(r);
}
const exactDupes = [...byNorm.entries()].filter(([, l]) => l.length > 1);

// Side-split pairs (left/right of same canonical) detected via simple matching
const sideRows = inv.filter(r => /\s+(left|right)\b/i.test(r.name || '') || /,\s*(left|right)\b/i.test(r.name || ''));

// Build merge plan: pick canonical, list rest as candidates for soft-delete.
const lines = [];
lines.push('-- IronPath exercises table cleanup -- 2026-05-11');
lines.push('-- ');
lines.push('-- Generated from skills/exercise-cleanup/inventory.json +');
lines.push('-- DUPLICATES.md + RENAMES.md. EVERY STATEMENT IS COMMENTED.');
lines.push('-- Founder must review and uncomment selectively, then run.');
lines.push('-- ');
lines.push('-- IMPORTANT: the `exercises` row is referenced by:');
lines.push('--   workout_exercises.exercise_id           (FK)');
lines.push('--   routine_exercises.exercise_id           (FK)');
lines.push('--   personal_records.exercise_id            (FK)');
lines.push('--   ai_trainer_programs.progression_data    (jsonb, NOT a FK)');
lines.push('--   exercise_logs.exercise_id               (FK, if it exists)');
lines.push('-- Before running any DELETE, run a foreign-key probe:');
lines.push('--   SELECT count(*) FROM workout_exercises WHERE exercise_id = \'<uuid>\';');
lines.push('-- If any row is FK-referenced, prefer the UPDATE workout_exercises');
lines.push('--   SET exercise_id = \'<canonical_uuid>\' WHERE exercise_id = \'<dupe_uuid>\';');
lines.push('-- pattern, then DELETE the dupe.');
lines.push('');

// ===== Part 1: rename plan =====
lines.push('-- ====================================================================');
lines.push('-- PART 1 -- Renames (name cleanups, capitalization, strip parens, side-merge)');
lines.push('-- ====================================================================');
lines.push('');

let renameCount = 0;
for (const r of inv) {
  if (!r.name || !hasWeirdFormatting(r.name)) continue;
  const proposed = proposeRename(r.name);
  if (!proposed || proposed === r.name) continue;
  const oldName = r.name.replace(/'/g, "''");
  const newName = proposed.replace(/'/g, "''");
  lines.push(`-- ${r.name} -> ${proposed}  (wger_id=${r.wger_id ?? 'null'})`);
  lines.push(`-- UPDATE exercises SET name = '${newName}' WHERE id = '${r.id}';`);
  renameCount++;
}
lines.push('');
lines.push(`-- (${renameCount} renames total)`);
lines.push('');

// ===== Part 2: exact-name dupe merges =====
lines.push('-- ====================================================================');
lines.push('-- PART 2 -- Exact-name duplicate merges');
lines.push('-- ====================================================================');
lines.push('-- For each cluster: keep the highest-scored row, repoint FK references');
lines.push('-- from the dupes to it, then delete the dupes.');
lines.push('');

let mergeCount = 0;
for (const [k, list] of exactDupes) {
  const canonical = pickCanonical(list);
  lines.push(`-- cluster "${k}" -- KEEP id=${canonical.id} (wger_id=${canonical.wger_id ?? 'null'} "${canonical.name}")`);
  for (const r of list) {
    if (r.id === canonical.id) continue;
    lines.push(`--   merge id=${r.id} (wger_id=${r.wger_id ?? 'null'} "${r.name}") into ${canonical.id}`);
    lines.push(`-- UPDATE workout_exercises SET exercise_id = '${canonical.id}' WHERE exercise_id = '${r.id}';`);
    lines.push(`-- UPDATE routine_exercises SET exercise_id = '${canonical.id}' WHERE exercise_id = '${r.id}';`);
    lines.push(`-- UPDATE personal_records SET exercise_id = '${canonical.id}' WHERE exercise_id = '${r.id}';`);
    lines.push(`-- DELETE FROM exercises WHERE id = '${r.id}';`);
    mergeCount++;
  }
  lines.push('');
}
lines.push(`-- (${mergeCount} dupe rows queued for merge+delete)`);
lines.push('');

// ===== Part 3: side-split merges =====
lines.push('-- ====================================================================');
lines.push('-- PART 3 -- LEFT/RIGHT side-split merges');
lines.push('-- ====================================================================');
lines.push('-- Per-side variants of stretches and unilateral lifts are merged into a');
lines.push('-- single canonical row. Per-leg tracking belongs in a future schema');
lines.push('-- change (workout_exercises.side enum), not as duplicate exercise rows.');
lines.push('');

// Pair side rows by canonical key
function sideKey(name) {
  let n = (name || '').toLowerCase();
  n = n.replace(/[–—]/g, '-');
  n = n.replace(/[^a-z0-9\s-]/g, ' ');
  n = n.replace(/,?\s+(left|right)\b/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

const sideGroups = new Map();
for (const r of sideRows) {
  const k = sideKey(r.name);
  if (!sideGroups.has(k)) sideGroups.set(k, []);
  sideGroups.get(k).push(r);
}

let sideMergeCount = 0;
for (const [k, group] of sideGroups) {
  if (group.length < 2) {
    // Single-side row (no pair). Rename only.
    const r = group[0];
    const newName = proposeRename(r.name);
    lines.push(`-- single side row "${r.name}" (wger_id=${r.wger_id ?? 'null'}) -> "${newName}"`);
    lines.push(`-- UPDATE exercises SET name = '${newName.replace(/'/g, "''")}' WHERE id = '${r.id}';`);
    lines.push('');
    continue;
  }
  // Pair (or triple): keep the one with most info; rename it; merge the rest.
  const canonical = pickCanonical(group);
  const proposed = proposeRename(canonical.name);
  lines.push(`-- side-merge cluster "${k}" -- KEEP id=${canonical.id} (wger_id=${canonical.wger_id ?? 'null'} "${canonical.name}") rename to "${proposed}"`);
  lines.push(`-- UPDATE exercises SET name = '${proposed.replace(/'/g, "''")}' WHERE id = '${canonical.id}';`);
  for (const r of group) {
    if (r.id === canonical.id) continue;
    lines.push(`--   merge id=${r.id} (wger_id=${r.wger_id ?? 'null'} "${r.name}") into ${canonical.id}`);
    lines.push(`-- UPDATE workout_exercises SET exercise_id = '${canonical.id}' WHERE exercise_id = '${r.id}';`);
    lines.push(`-- UPDATE routine_exercises SET exercise_id = '${canonical.id}' WHERE exercise_id = '${r.id}';`);
    lines.push(`-- UPDATE personal_records SET exercise_id = '${canonical.id}' WHERE exercise_id = '${r.id}';`);
    lines.push(`-- DELETE FROM exercises WHERE id = '${r.id}';`);
    sideMergeCount++;
  }
  lines.push('');
}
lines.push(`-- (${sideMergeCount} side-rows queued for merge+delete)`);
lines.push('');

lines.push('-- ====================================================================');
lines.push('-- END OF PLAN');
lines.push('-- ====================================================================');

fs.writeFileSync(path.join(OUT_DIR, 'SUGGESTED-CLEANUP.sql'), lines.join('\n'));
console.log(`Wrote ${path.join(OUT_DIR, 'SUGGESTED-CLEANUP.sql')}`);
console.log(`  renames=${renameCount} dupe_merges=${mergeCount} side_merges=${sideMergeCount}`);
