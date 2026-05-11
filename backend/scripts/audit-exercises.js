// One-shot audit + inventory of the production `exercises` table.
//
// Outputs (all written under repo-root /skills/exercise-cleanup/, which is
// gitignored):
//   inventory.json   -- full row dump { id, wger_id, name, equipment,
//                                       primary_muscles, logging_type }
//   DUPLICATES.md    -- duplicate clusters by normalized name + canonical
//                       grouping
//   RENAMES.md       -- proposed name cleanups (capitalization, trailing
//                       notes, special characters, LEFT/RIGHT merges)
//
// Usage:  node backend/scripts/audit-exercises.js
//   reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from backend/.env.
//
// READ-ONLY. Does not write to the database.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../../skills/exercise-cleanup');
fs.mkdirSync(OUT_DIR, { recursive: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- helpers ----------

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[–—]/g, '-')        // en/em dash -> hyphen
    .replace(/[^a-z0-9\s-]/g, ' ')          // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical key: removes equipment qualifiers, side suffixes, parenthetical
// notes, and common synonyms so that "Barbell squat", "Barbell Squat",
// "Back Squat", and "barbell back squat" all collapse to "back squat".
function canonicalKey(name) {
  let n = normalizeName(name);
  // strip side suffixes
  n = n.replace(/\b(left|right|l|r)\b/g, ' ');
  // strip very generic helpers
  n = n.replace(/\b(rdl)\b/g, 'romanian deadlift');
  // collapse spaces
  n = n.replace(/\s+/g, ' ').trim();
  // canonical synonym squash
  const SYNONYMS = [
    { re: /\bback squat\b/, to: 'squat' },
    { re: /\bbarbell squat\b/, to: 'squat' },
    { re: /\bromanian deadlift\b/, to: 'romanian deadlift' },
    { re: /\bbarbell deadlift\b/, to: 'deadlift' },
    { re: /\bconventional deadlift\b/, to: 'deadlift' },
    { re: /\bdeadlifts\b/, to: 'deadlift' },
    { re: /\bpush ups?\b/, to: 'push-up' },
    { re: /\bpushups?\b/, to: 'push-up' },
    { re: /\bpush-ups?\b/, to: 'push-up' },
    { re: /\bpull ups?\b/, to: 'pull-up' },
    { re: /\bpullups?\b/, to: 'pull-up' },
    { re: /\bpull-ups?\b/, to: 'pull-up' },
    { re: /\bchin ups?\b/, to: 'chin-up' },
    { re: /\bchin-ups?\b/, to: 'chin-up' },
    { re: /\bsit ups?\b/, to: 'sit-up' },
    { re: /\bcrunches\b/, to: 'crunch' },
    { re: /\bdips\b/, to: 'dip' },
    { re: /\blunges\b/, to: 'lunge' },
    { re: /\bburpees\b/, to: 'burpee' },
    { re: /\brows\b/, to: 'row' },
    { re: /\bcurls\b/, to: 'curl' },
    { re: /\bplanks\b/, to: 'plank' },
    { re: /\bsquats\b/, to: 'squat' },
  ];
  for (const { re, to } of SYNONYMS) n = n.replace(re, to);
  return n.replace(/\s+/g, ' ').trim();
}

// Title-case helper that preserves common acronyms/abbreviations.
const KEEP_LOWER = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const KEEP_UPPER = new Set(['RDL', 'KB', 'DB', 'BB', 'EZ', 'TRX', 'AMRAP']);

function titleCase(s) {
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      if (i > 0 && KEEP_LOWER.has(lower)) return lower;
      // handle hyphenated words like "pull-up"
      if (word.includes('-')) {
        return word
          .split('-')
          .map((p, j) => {
            const pu = p.toUpperCase();
            if (KEEP_UPPER.has(pu)) return pu;
            return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          })
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Proposed clean name: title-case, strip trailing "(RDL)" / "(NB)" /
// LEFT-RIGHT, normalize hyphens, drop stray icons.
function proposeRename(name) {
  if (!name) return name;
  let n = name;
  // strip emoji + non-printable
  n = n.replace(/[✀-➿-‑-⛿]/g, '');
  // normalize dashes
  n = n.replace(/[–—]/g, '-');
  // strip parenthetical abbreviations like "(RDL)", "(NB)"
  n = n.replace(/\s*\(\s*(RDL|NB|R|L|right|left|short|long|s|l)\s*\)\s*/gi, ' ');
  // strip trailing " left" / " right"
  n = n.replace(/\s+(left|right)\b/gi, '');
  // collapse spaces
  n = n.replace(/\s+/g, ' ').trim();
  // standardize push-up / pull-up hyphenation
  n = n.replace(/\bpush ups?\b/gi, 'Push-Up');
  n = n.replace(/\bpushups?\b/gi, 'Push-Up');
  n = n.replace(/\bpull ups?\b/gi, 'Pull-Up');
  n = n.replace(/\bpullups?\b/gi, 'Pull-Up');
  n = n.replace(/\bchin ups?\b/gi, 'Chin-Up');
  n = n.replace(/\bsit ups?\b/gi, 'Sit-Up');
  // title-case
  n = titleCase(n);
  // restore standard hyphenated forms after title-case
  n = n.replace(/\bPush-up\b/g, 'Push-Up');
  n = n.replace(/\bPull-up\b/g, 'Pull-Up');
  n = n.replace(/\bChin-up\b/g, 'Chin-Up');
  n = n.replace(/\bSit-up\b/g, 'Sit-Up');
  return n;
}

function hasWeirdFormatting(name) {
  if (!name) return false;
  // emoji / non-ASCII (excluding plain hyphens & parens already in our table)
  if (/[^\x20-\x7E]/.test(name)) return true;
  // trailing left/right or (RDL)/(NB)/etc.
  if (/\s+(left|right)\b/i.test(name)) return true;
  if (/\(\s*(RDL|NB|R|L)\s*\)/i.test(name)) return true;
  // lowercase first letter of multi-word name (e.g. "Barbell squat")
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words.some((w, i) => i > 0 && /^[a-z]/.test(w) && !KEEP_LOWER.has(w.toLowerCase()))) return true;
  // first word starts lowercase
  if (/^[a-z]/.test(name.trim())) return true;
  // trailing colon, weird punctuation runs
  if (/[?!]{1,}$|::+|\.\.\.$/.test(name)) return true;
  return false;
}

// ---------- main ----------

async function fetchAll() {
  let from = 0;
  const pageSize = 500;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, wger_id, name, equipment, primary_muscles, secondary_muscles, logging_type, image_url, is_custom')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('Query failed:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function buildDuplicateClusters(rows) {
  // Group by normalized name (exact-ish duplicates)
  const byNorm = new Map();
  for (const r of rows) {
    const k = normalizeName(r.name);
    if (!k) continue;
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(r);
  }
  const exactDupes = [...byNorm.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Group by canonical key (synonym / variant duplicates)
  const byCanon = new Map();
  for (const r of rows) {
    const k = canonicalKey(r.name);
    if (!k) continue;
    if (!byCanon.has(k)) byCanon.set(k, []);
    byCanon.get(k).push(r);
  }
  const canonDupes = [...byCanon.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return { exactDupes, canonDupes };
}

function pickCanonical(list) {
  // Score each row; highest score = canonical row to keep.
  // Tie-breaker: lowest wger_id (older / more stable).
  function score(r) {
    let s = 0;
    if (r.image_url) s += 4;
    if (r.wger_id != null) s += 2;
    if (Array.isArray(r.primary_muscles) && r.primary_muscles.length > 0) s += 1;
    // prefer names starting uppercase
    if (r.name && /^[A-Z]/.test(r.name.trim())) s += 1;
    // prefer names without trailing left/right or parens
    if (r.name && !/\b(left|right)\b/i.test(r.name) && !/\(/.test(r.name)) s += 1;
    return s;
  }
  return [...list].sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    return (a.wger_id ?? 1e9) - (b.wger_id ?? 1e9);
  })[0];
}

function writeDuplicatesReport(rows, { exactDupes, canonDupes }) {
  const lines = [];
  lines.push('# Exercise Duplicates Report');
  lines.push('');
  lines.push(`Total rows scanned: **${rows.length}**`);
  lines.push(`Exact-name duplicate clusters (normalized): **${exactDupes.length}**`);
  lines.push(`Canonical-key duplicate clusters: **${canonDupes.length}**`);
  lines.push('');
  lines.push('Canonical row is marked **KEEP**. Other rows are flagged for');
  lines.push('merge / soft-delete pending FK checks.');
  lines.push('');

  lines.push('## 1. Exact-name duplicate clusters');
  lines.push('');
  lines.push('Rows that share a normalized name (lowercase + punctuation-stripped).');
  lines.push('');
  if (exactDupes.length === 0) {
    lines.push('_None._');
  } else {
    for (const [k, list] of exactDupes) {
      lines.push(`### "${k}" (${list.length} rows)`);
      lines.push('');
      const canonical = pickCanonical(list);
      for (const r of list) {
        const mark = r.id === canonical.id ? '**KEEP**' : 'merge';
        lines.push(`- ${mark} | wger_id=${r.wger_id ?? 'null'} | "${r.name}" | id=${r.id} | image=${r.image_url ? 'y' : 'n'}`);
      }
      lines.push('');
    }
  }

  lines.push('## 2. Canonical-key duplicate clusters');
  lines.push('');
  lines.push('Rows that collapse to the same canonical lift after stripping');
  lines.push('equipment qualifiers, side suffixes, plurals, and synonyms.');
  lines.push('Use judgment: not every cluster here is a true dupe (e.g. dumbbell');
  lines.push('vs barbell row may be intentionally separate).');
  lines.push('');
  if (canonDupes.length === 0) {
    lines.push('_None._');
  } else {
    for (const [k, list] of canonDupes) {
      // Skip clusters already covered by the exact-name section unless
      // they contain meaningfully different names.
      const uniqueNames = new Set(list.map(r => normalizeName(r.name)));
      if (uniqueNames.size === 1) continue;
      lines.push(`### canonical "${k}" (${list.length} rows)`);
      lines.push('');
      const canonical = pickCanonical(list);
      for (const r of list) {
        const mark = r.id === canonical.id ? '**KEEP**' : 'review';
        lines.push(`- ${mark} | wger_id=${r.wger_id ?? 'null'} | "${r.name}" | id=${r.id} | image=${r.image_url ? 'y' : 'n'}`);
      }
      lines.push('');
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'DUPLICATES.md'), lines.join('\n'));
  console.log(`Wrote ${path.join(OUT_DIR, 'DUPLICATES.md')}`);
}

function writeRenamesReport(rows) {
  const lines = [];
  lines.push('# Exercise Rename Plan');
  lines.push('');
  lines.push('Proposed name cleanups for rows with weird capitalization,');
  lines.push('trailing notes, special characters, or LEFT/RIGHT split entries.');
  lines.push('');
  lines.push('Side-split rows (e.g. "Bulgarian split squats left" /');
  lines.push('"Bulgarian split squats right") are merged into a single canonical');
  lines.push('name -- per-side tracking will live in a schema change later,');
  lines.push('not as duplicate exercise rows.');
  lines.push('');
  lines.push('| old_name | proposed_name | wger_id | id | note |');
  lines.push('| --- | --- | --- | --- | --- |');

  let count = 0;
  // Track side-split merges
  const sideRows = [];
  for (const r of rows) {
    if (!r.name) continue;
    const weird = hasWeirdFormatting(r.name);
    if (!weird) continue;
    const proposed = proposeRename(r.name);
    if (!proposed || proposed === r.name) continue;
    const note = /\s+(left|right)\b/i.test(r.name)
      ? 'side-split row -- merge into single canonical row'
      : (/[^\x20-\x7E]/.test(r.name) ? 'strip non-ASCII'
        : (/\(\s*(RDL|NB|R|L)\s*\)/i.test(r.name) ? 'strip parenthetical note'
          : 'capitalization'));
    if (note.startsWith('side-split')) sideRows.push(r);
    lines.push(`| ${r.name.replace(/\|/g, '\\|')} | ${proposed.replace(/\|/g, '\\|')} | ${r.wger_id ?? ''} | ${r.id} | ${note} |`);
    count++;
  }

  lines.push('');
  lines.push(`**Total rows flagged for rename: ${count}**`);
  lines.push(`**Of those, side-split rows to merge: ${sideRows.length}**`);
  lines.push('');
  lines.push('## Side-split merge groups');
  lines.push('');

  // Group side rows by canonical key
  const groups = new Map();
  for (const r of sideRows) {
    const k = canonicalKey(r.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  if (groups.size === 0) {
    lines.push('_None._');
  } else {
    for (const [k, list] of groups) {
      lines.push(`### "${k}" (${list.length} rows)`);
      const target = proposeRename(list[0].name);
      lines.push(`Recommended canonical: **${target}**`);
      for (const r of list) {
        lines.push(`- wger_id=${r.wger_id ?? 'null'} | "${r.name}" | id=${r.id}`);
      }
      lines.push('');
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'RENAMES.md'), lines.join('\n'));
  console.log(`Wrote ${path.join(OUT_DIR, 'RENAMES.md')}`);
}

(async () => {
  console.log(`Supabase: ${url}`);
  console.log('Fetching all rows from exercises (paginated)...');
  const rows = await fetchAll();
  console.log(`Loaded ${rows.length} rows.`);

  // Write inventory.json
  const inv = rows.map(r => ({
    id: r.id,
    wger_id: r.wger_id,
    name: r.name,
    equipment: r.equipment,
    primary_muscles: r.primary_muscles,
    logging_type: r.logging_type,
    image_url: r.image_url ? true : false,
  }));
  fs.writeFileSync(path.join(OUT_DIR, 'inventory.json'), JSON.stringify(inv, null, 2));
  console.log(`Wrote ${path.join(OUT_DIR, 'inventory.json')} (${inv.length} rows)`);

  const dupes = buildDuplicateClusters(rows);
  writeDuplicatesReport(rows, dupes);
  writeRenamesReport(rows);

  console.log('Done.');
})();
