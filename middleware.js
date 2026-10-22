import { updateSession } from '@/lib/supabase/middleware';

export function middleware(request) {
  return updateSession(request);
}

export const config = {
  // Skip static files, the service worker, manifest and icons so they work offline and fast.
  matcher: ['/((?!_next/static|_next/image|sw.js|manifest.json|icons/|favicon.ico|robots.txt).*)'],
};
