import { getSupabaseConfig } from '@/lib/supabase/config';
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/** Per-request client acting as the signed-in user (RLS applies). */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS: use only for actions that must, after checking the caller
 * yourself (today: deleting the caller's own auth account).
 */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
