'use server';
import { getViewer, isStaff } from '@/lib/auth';
import { LEVELS } from '@/lib/constants';

/** How many members an audience reaches. Uses the caller's own RLS scope, so it can't leak counts. */
export async function audienceCount(level, department, school) {
  const { supabase, profile } = await getViewer();
  if (!isStaff(profile)) return null;
  let q = supabase.from('profiles').select('id', { count: 'exact', head: true }).not('onboarded_at', 'is', null);
  const lv = Number(level);
  if (LEVELS.includes(lv)) q = q.eq('level', lv);
  if (school && school !== 'all' && /^[A-Za-z]{2,6}$/.test(school)) q = q.eq('school_code', school);
  if (department && String(department).trim().length >= 2) q = q.ilike('department', String(department).trim().replace(/[%_]/g, ''));
  const { count, error } = await q;
  return error ? null : count;
}
