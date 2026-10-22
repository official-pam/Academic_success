'use client';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { createBrowserClient } from '@supabase/ssr';

let client;
/** Browser client: anon key only. Data access is decided by RLS, not by this file. */
export function getBrowserSupabase() {
  if (!client) {
    const { url, key } = getSupabaseConfig();
    client = createBrowserClient(url, key);
  }
  return client;
}
