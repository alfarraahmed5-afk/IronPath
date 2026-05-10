// POST /api/lead
// -----------------------------------------------------------------------------
// Public surface: { gym_name, owner_email, member_count } JSON body.
// Validates against the same Zod schema the client uses (single source of
// truth -- see components/lead-form.tsx), HMAC-signs the payload, and forwards
// to the IronPath backend. On success returns { id, redirect_url }; on backend
// failure returns 502 with a generic message.
//
// Edge runtime so we get region-local latency on the signature step and
// trivial throttling at the platform layer. crypto.subtle is available in the
// edge environment so the HMAC step needs no Node-only modules.
//
// TODO(perf): per-IP rate limiting (Upstash redis token bucket). Vercel's
//   edge throttling covers obvious abuse but a deliberate flood would still
//   reach the backend. Out of scope for the recovery sprint; tracked.

import { NextResponse } from 'next/server';
import { leadSchema } from '@/lib/lead-schema';

export const runtime = 'edge';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'https://backend-production-f43b.up.railway.app/api/v1';

// HMAC key: server-only. Never log this; never echo it back.
const HMAC_SECRET = process.env.LEAD_HMAC_SECRET ?? '';

interface BackendLeadResponse {
  id?: string;
  lead_id?: string;
  error?: string;
}

export async function POST(req: Request) {
  // 1. Parse + validate.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    // Don't leak the per-field messages from the server schema (those are
    // English-only); the client already validated and the user only reaches
    // here via curl or a misbehaving extension. A generic message is enough.
    return NextResponse.json(
      { error: 'Validation failed. Check your input and try again.' },
      { status: 422 },
    );
  }
  const lead = parsed.data;

  // 2. HMAC-sign the canonical JSON. Key order matters for signature stability;
  //    we re-serialize from the parsed object with a fixed shape.
  const canonical = JSON.stringify({
    gym_name: lead.gym_name,
    owner_email: lead.owner_email,
    member_count: lead.member_count,
  });

  let signature = '';
  if (HMAC_SECRET) {
    try {
      signature = await hmacSha256Hex(HMAC_SECRET, canonical);
    } catch (err) {
      console.error('[api/lead] HMAC sign failed:', err);
      return NextResponse.json(
        { error: 'Internal signing error.' },
        { status: 500 },
      );
    }
  } else {
    // Missing secret in env is a deployment misconfiguration. Log loudly and
    // fail the request rather than forwarding an unsigned payload that the
    // backend will (correctly) reject.
    console.error(
      '[api/lead] LEAD_HMAC_SECRET is not configured; refusing to forward.',
    );
    return NextResponse.json(
      { error: 'Server is not configured to accept leads. Try again shortly.' },
      { status: 503 },
    );
  }

  // 3. Forward to the backend.
  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/leads`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-IronPath-Signature': signature,
      },
      body: canonical,
    });
  } catch (err) {
    console.error('[api/lead] Backend fetch threw:', err);
    return NextResponse.json(
      { error: 'We could not reach the lead service. Try again in a minute.' },
      { status: 502 },
    );
  }

  if (!backendRes.ok) {
    let body: BackendLeadResponse | null = null;
    try {
      body = (await backendRes.json()) as BackendLeadResponse;
    } catch {
      /* ignore -- backend may not have returned JSON */
    }
    console.error(
      '[api/lead] Backend rejected lead:',
      backendRes.status,
      body?.error ?? '(no body)',
    );
    return NextResponse.json(
      { error: 'We could not save your details right now. Try again, or WhatsApp Ahmed directly.' },
      { status: 502 },
    );
  }

  // 4. Decode backend response. The backend returns either { id } or
  //    { lead_id }; tolerate both during the sprint.
  let backendBody: BackendLeadResponse | null = null;
  try {
    backendBody = (await backendRes.json()) as BackendLeadResponse;
  } catch {
    /* tolerate empty body -- backend may return 204 in older versions */
  }
  const id = backendBody?.id ?? backendBody?.lead_id ?? '';

  // 5. Build the redirect URL.
  //    Admin /signup does not exist yet (Q4 2026 per /roadmap), so for now we
  //    point the visitor back to /start?status=submitted where the lead-form
  //    component renders a thank-you state. The aspirational admin URL is left
  //    as a comment so the next maintainer knows where this is headed.
  //
  //    Aspirational target (when admin /signup ships):
  //      `${ADMIN_URL}/signup?lead_id=${id}&prefill=${encoded prefill blob}`
  const redirect_url = `/start?status=submitted${id ? `&id=${encodeURIComponent(id)}` : ''}`;

  return NextResponse.json({ id, redirect_url }, { status: 200 });
}

// ─── helpers ───────────────────────────────────────────────────────────────

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}
