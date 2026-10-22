'use server';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { LEVELS } from '@/lib/constants';

function failure(stage, error, values) {
  // Log only the operation and error code; never profile data, tokens, or raw messages.
  const code = /^[A-Z0-9_]{1,32}$/.test(error?.code || '') ? error.code : 'UNKNOWN';
  console.error('[onboarding]', { stage, code });
  return { message: 'Couldn\'t finish setup. Please try again. If this continues, contact the committee.', values };
}

export async function completeOnboarding(_prev, formData) {
  const full_name = String(formData.get('full_name') || '').trim().replace(/\s+/g, ' ');
  const level = Number(formData.get('level'));
  const department = String(formData.get('department') || '').trim().replace(/\s+/g, ' ');
  const days = Number(formData.get('days_per_week'));
  const values = { full_name, level, department, days_per_week: days };
  const errors = {};
  if (full_name.length < 2 || full_name.length > 80) errors.full_name = 'Enter your name.';
  if (!LEVELS.includes(level)) errors.level = 'Choose your level.';
  if (department.length < 2 || department.length > 80) errors.department = 'Enter your department, for example "Computer Science".';
  if (!Number.isInteger(days) || !(days >= 1 && days <= 7)) errors.days_per_week = 'Choose how many days a week you\'ll read.';
  if (Object.keys(errors).length) return { errors, values };

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ full_name, level, department })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();
  if (error) return failure('profile.update', error, values);
  if (!profile) return failure('profile.missing_or_not_visible', { code: 'PROFILE_NOT_FOUND' }, values);

  const { count, error: goalError } = await supabase.from('goals').select('id', { count: 'exact', head: true }).eq('active', true);
  if (goalError) return failure('goals.read', goalError, values);
  if (!count) {
    const { error: createError } = await supabase.rpc('set_goal', { p_title: 'Read for 30 minutes', p_days_per_week: days, p_minutes_per_day: 30 });
    if (createError) return failure('goals.create', createError, values);
  }
  const { data: completed, error: completionError } = await supabase.from('profiles')
    .update({ onboarded_at: new Date().toISOString() }).eq('id', user.id).select('id').maybeSingle();
  if (completionError || !completed) return failure('profile.complete', completionError || { code: 'PROFILE_NOT_FOUND' }, values);
  redirect('/today?welcome=1');
}
