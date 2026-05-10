// STUB — Team Beta β3 owns the real implementation.
// Public API: POST { gym_name, owner_email, member_count } →
// { id, redirect_url } (admin signup with prefill).

import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(_req: Request) {
  return NextResponse.json(
    { error: 'lead form not yet wired — Team Beta β3 in flight' },
    { status: 501 }
  );
}
