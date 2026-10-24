import { updateSession } from '@/lib/supabase/middleware';

export function middleware(request) {
  return updateSession(request);
}

export const config = {
  // Skip static files, the service worker, manifest, icons and any image/font file so they work offline
  // and don't pay for a Supabase auth round-trip on every request.
  matcher: [
    '/((?!_next/static|_next/image|sw.js|manifest.json|icons/|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|txt|xml)$).*)',
  ],
};
