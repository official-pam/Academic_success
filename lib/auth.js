import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

/** The signed-in user and their profile, fetched once per request. */
export const getViewer = cache(async () => {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, level, department, role, coordinator_level, onboarded_at')
    .eq('id', user.id)
    .maybeSingle();
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
