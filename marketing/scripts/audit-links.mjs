#!/usr/bin/env node
// audit-links.mjs
// -----------------------------------------------------------------------------
// Crawl every page on a running marketing dev server, collect every internal
// href, and verify each one returns 2xx (or 3xx pointing to a 2xx). Designed
// to run after Super Agents 1 + 2 + 3 land their integration so we can ship
// confident there are no 404 craters between scenes.
//
// Usage:
//   node marketing/scripts/audit-links.mjs                 # default localhost:5175
//   BASE=https://ironpath.health node ...                  # production smoke
//
// Output: a concise table of { href, status, source }, plus a non-zero exit
// code if any 4xx/5xx was seen.
//
// Implementation notes:
//   - We do NOT use a headless browser. Plain fetch + a tiny HTML href
//     extractor is enough: the marketing site renders all internal links
//     in HTML even when JS is disabled (RSC + Next/Link both emit anchors).
//   - We follow redirects but record the final status. A 308 chain that ends
//     in 200 counts as healthy.
//   - Same-origin only. External links (WhatsApp, LinkedIn, etc.) are recorded
//     but not fetched -- they would slow the audit and we don't own them.

import { setTimeout as sleep } from 'node:timers/promises';

const BASE = (process.env.BASE ?? 'http://localhost:5175').replace(/\/$/, '');

// Seed pages -- the auditor BFS-crawls outward from these. Add a page here
// if it isn't reachable from the homepage's link graph (e.g. a /demo page
// only linked from an email sequence).
const SEEDS = [
  '/',
  '/ar',
  '/pricing',
  '/blog',
  '/for-gyms',
  '/roadmap',
  '/start',
  '/eg',
  '/privacy',
  '/terms',
];

const ORIGIN = new URL(BASE).origin;

function isInternal(href) {
  if (!href) return false;
  if (href.startsWith('#')) return false;          // in-page anchor
  if (href.startsWith('mailto:')) return false;
  if (href.startsWith('tel:')) return false;
  if (href.startsWith('javascript:')) return false;
  if (href.startsWith('/')) return true;
  try {
    const u = new URL(href);
    return u.origin === ORIGIN;
  } catch {
    return false;
  }
}

function normalize(href, fromUrl) {
  try {
    const u = new URL(href, fromUrl);
    // Strip trailing slash (except root) + drop the hash for dedupe purposes;
    // we'll record the hash separately if useful later.
    let p = u.pathname;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return u.origin + p + (u.search ?? '');
  } catch {
    return null;
  }
}

// Minimal href extractor. Robust against attribute order + quote style.
function extractHrefs(html) {
  const out = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[2] ?? m[3] ?? m[4];
    if (raw) out.push(raw);
  }
  return out;
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'ironpath-link-audit/1.0' },
    });
    const text = res.headers.get('content-type')?.includes('text/html')
      ? await res.text()
      : '';
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: err.message };
  }
}

async function main() {
  const visited = new Map();          // url -> { status, source }
  const queue = SEEDS.map((s) => ({ url: ORIGIN + s, source: '(seed)' }));
  let failures = 0;

  while (queue.length) {
    const { url, source } = queue.shift();
    if (visited.has(url)) continue;

    const { ok, status, text, error } = await fetchPage(url);
    visited.set(url, { status: status || (error ? 'ERR' : 0), source, error });
    if (!ok) failures++;

    if (text) {
      for (const raw of extractHrefs(text)) {
        if (!isInternal(raw)) continue;
        const norm = normalize(raw, url);
        if (!norm) continue;
        if (visited.has(norm)) continue;
        if (queue.some((q) => q.url === norm)) continue;
        queue.push({ url: norm, source: url });
      }
    }

    // Be polite to the dev server -- 50ms between hits is more than enough
    // for a local box and prevents Next's dev compiler from queuing hard.
    await sleep(50);
  }

  // Report
  console.log(`\nAudited ${visited.size} URLs, ${failures} failure(s)\n`);
  console.log('STATUS  URL                                              SOURCE');
  console.log('------  -----------------------------------------------  -----------------------------------------');
  for (const [url, info] of visited.entries()) {
    const marker = info.status >= 200 && info.status < 400 ? ' ' : '!';
    console.log(
      `${marker}${String(info.status).padStart(5)}  ${url.replace(ORIGIN, '').padEnd(48)}  ${info.source.replace(ORIGIN, '')}`,
    );
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(2);
});
