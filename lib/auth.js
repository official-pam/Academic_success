import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase/server';

/** The signed-in user and their profile, fetched once per request. */
export const getViewer = cache(async () => {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    console.error('[viewer] profile.read failed', { code: profileError.code });
    throw new Error('Could not load your profile. Please try again.');
  }
  // Owner bootstrap: emails listed in the server-only ADMIN_EMAILS variable become Admin on sign-in,
  // so the first admin never needs the SQL editor. Uses the service-role key, on the server only.
  if (profile && profile.role !== 'chairman' && isBootstrapAdmin(user.email)) {
    try {
      const { data } = await getAdminSupabase().from('profiles').update({ role: 'chairman' }).eq('id', user.id).select(PROFILE_COLUMNS).maybeSingle();
      if (data) return { supabase, user, profile: data };
    } catch {
      console.error('[viewer] admin bootstrap failed');
    }
  }
  return { supabase, user, profile };
});

const PROFILE_COLUMNS = 'id, full_name, level, department, role, coordinator_level, committee_school, school_code, programme_id, prior_cgpa, prior_units, feed_seen_at, onboarded_at';

function isBootstrapAdmin(email) {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return Boolean(email) && list.includes(email.toLowerCase());
}

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
