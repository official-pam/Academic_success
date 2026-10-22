import { safeNext } from '@/lib/auth-redirect';
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

// Email confirmation and password-reset links land here (PKCE code, or token_hash templates).
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const nextParam = url.searchParams.get('next') || '/today';
  const next = safeNext(nextParam);

  const supabase = await getServerSupabase();
  let error = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  else error = new Error('missing code');

  const response = NextResponse.redirect(new URL(error ? '/sign-in?error=link' : next, url.origin));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
