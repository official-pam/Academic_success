import { getSupabaseConfig } from '@/lib/supabase/config';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/reset', '/auth', '/offline', '/privacy'];

function unavailable(reason) {
  // Do not log keys, cookies, tokens, or raw authentication errors.
  console.error(`[auth middleware] ${reason}`);
  return new NextResponse('Sign-in is temporarily unavailable. Please try again shortly.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' },
  });
}

export async function updateSession(request) {
  let supabaseUrl, supabaseKey;
  try {
    ({ url: supabaseUrl, key: supabaseKey } = getSupabaseConfig());
  } catch {
    return unavailable('Invalid Supabase public configuration. Check URL and publishable key (or legacy anon key), then redeploy.');
  }

  let response = NextResponse.next({ request });
  let user;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Validate identity with Auth; never authorize using an unverified session.
    const { data, error } = await supabase.auth.getUser();
    if (error && (error.status >= 500 || error.name === 'AuthRetryableFetchError')) {
      return unavailable('Supabase Auth is temporarily unreachable.');
    }
    user = error ? null : data?.user;
  } catch {
    return unavailable('Supabase client initialization or user validation failed. Check configuration and Auth availability.');
  }

  const { pathname } = request.nextUrl;
  const isPublic = pathname !== '/reset/update' && PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const redirect = (to, keepNext) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = keepNext ? `?next=${encodeURIComponent(pathname + request.nextUrl.search)}` : '';
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    r.headers.set('Cache-Control', 'private, no-store');
    return r;
  };

  if (!user && !isPublic) return redirect('/sign-in', pathname !== '/');
  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) return redirect('/today');
  if (pathname === '/') return redirect(user ? '/today' : '/sign-in');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
