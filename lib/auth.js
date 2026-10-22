import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

/** The signed-in user and their profile, fetched once per request. */
export const getViewer = cache(async () => {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, level, department, role, coordinator_level, onboarded_at')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    console.error('[viewer] profile.read failed', { code: profileError.code });
    throw new Error('Could not load your profile. Please try again.');
  }
  return { supabase, user, profile };
});

export async function requireMember() {
  const v = await getViewer();
  if (!v.user) redirect('/sign-in');
  if (!v.profile?.onboarded_at) redirect('/onboarding');
  return v;
}

export const isStaff = (p) => p?.role === 'coordinator' || p?.role === 'chairman';

/** UI guard only; the database enforces the same rule through RLS. */
export async function requireStaff() {
  const v = await requireMember();
  if (!isStaff(v.profile)) redirect('/today');
  return v;
}

export async function requireChairman() {
  const v = await requireMember();
  if (v.profile.role !== 'chairman') redirect('/admin');
  return v;
}

export function firstName(profile) {
  return (profile?.full_name || '').trim().split(/\s+/)[0] || 'there';
}
