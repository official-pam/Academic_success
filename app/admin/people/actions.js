'use server';
import { requireChairman } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { LEVELS } from '@/lib/constants';

export async function setRole(_prev, formData) {
  const { supabase, user } = await requireChairman();
  const id = String(formData.get('id'));
  const value = String(formData.get('role'));
  if (!isUuid(id)) return { message: 'Unknown member.' };
  let update;
  if (value === 'member') update = { role: 'member', coordinator_level: null };
  else if (value === 'chairman') update = { role: 'chairman', coordinator_level: null };
  else if (value.startsWith('coordinator:') && LEVELS.includes(Number(value.split(':')[1]))) update = { role: 'coordinator', coordinator_level: Number(value.split(':')[1]) };
  else return { message: 'Choose a role.' };
  if (id === user.id && update.role !== 'chairman') return { message: 'Appoint another chairman first, then ask them to change your role.' };
  const { data, error } = await supabase.from('profiles').update(update).eq('id', id).select('id').maybeSingle();
  if (error || !data) return { message: error?.code === '42501' ? 'Only the chairman can change roles.' : 'Couldn\'t change the role. Try again.' };
  return { ok: true, message: 'Role updated.' };
}
