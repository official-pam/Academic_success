'use server';
import { requireChairman } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { LEVELS } from '@/lib/constants';

/** Admin only: make someone a Member, a Committee head (for a school, optionally one level) or an Admin. */
export async function setRole(_prev, formData) {
  const { supabase, user } = await requireChairman();
  const id = String(formData.get('id'));
  const role = String(formData.get('role'));
  const school = String(formData.get('committee_school') || '');
  const levelRaw = String(formData.get('coordinator_level') || '');
  if (!isUuid(id)) return { message: 'Unknown member.' };

  let update;
  if (role === 'member') update = { role: 'member', coordinator_level: null, committee_school: null };
  else if (role === 'chairman') update = { role: 'chairman', coordinator_level: null, committee_school: null };
  else if (role === 'coordinator') {
    if (!/^[A-Za-z]{2,6}$/.test(school)) return { message: 'Choose the school this committee head looks after.' };
    const level = levelRaw === '' || levelRaw === 'all' ? null : Number(levelRaw);
    if (level !== null && !LEVELS.includes(level)) return { message: 'Choose a level or all levels.' };
    update = { role: 'coordinator', committee_school: school, coordinator_level: level };
  } else return { message: 'Choose a role.' };

  if (id === user.id && update.role !== 'chairman') {
    return { message: 'Make someone else admin first, then ask them to change your role.' };
  }
  const { data, error } = await supabase.from('profiles').update(update).eq('id', id).select('id').maybeSingle();
  if (error || !data) return { message: error?.code === '42501' ? 'Only the admin can change roles.' : 'Couldn\'t change the role. Try again.' };
  return { ok: true, message: 'Saved.' };
}
