/** Shared public configuration. Explicit env reads allow Next.js browser inlining. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY), then rebuild.');
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Supabase URL must use HTTP(S).');
  if (key.startsWith('sb_secret_')) throw new Error('Use a publishable key, never a secret key, in public configuration.');
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') throw new Error('Service-role keys cannot be used in public configuration.');
    } catch (error) {
      if (error.message.includes('Service-role')) throw error;
    }
  }
  return { url, key };
}
