// STUB — Team Beta β3 owns the real implementation.
// Edge middleware: geo cookie + A/B variant cookie (3 hero value-prop variants).

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
