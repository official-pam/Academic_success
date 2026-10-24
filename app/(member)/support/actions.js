'use server';
import { requireMember } from '@/lib/auth';
import { isUuid } from '@/lib/admin';

const clean = (v, max) => String(v || '').replace(/\s+\n/g, '\n').trim().slice(0, max);

/** A prayer point any member can share with everyone (shown under the committee's points). */
export async function addMemberPoint(_prev, formData) {
  const body = clean(formData.get('body'), 400);
  if (body.length < 3) return { errors: { body: 'Write your prayer point (at least a few words).' } };
  const { supabase, user } = await requireMember();
  const { error } = await supabase.from('member_prayer_points').insert({ body, user_id: user.id });
  if (error) return { message: 'Couldn\'t share it. Check your connection and try again.' };
  return { ok: true, message: 'Shared with everyone.', reset: Date.now() };
}

export async function deleteMemberPoint(formData) {
  const id = String(formData.get('id'));
  if (!isUuid(id)) return;
  const { supabase } = await requireMember();
  await supabase.from('member_prayer_points').delete().eq('id', id);
}

/** Admin or the author's committee head hides (or shows again) a member's prayer point. */
export async function moderateMemberPoint(formData) {
  const id = String(formData.get('id'));
  if (!isUuid(id)) return;
  const { supabase } = await requireMember();
  await supabase.rpc('moderate_prayer_point', { p_id: id, p_hidden: formData.get('hidden') === '1' });
}

/** A private prayer request: only the member's committee head and the admin see it. */
export async function sendPrayerRequest(_prev, formData) {
  const body = clean(formData.get('body'), 1000);
  if (body.length < 3) return { errors: { body: 'Tell the committee what to pray about.' } };
  const { supabase, user } = await requireMember();
  const { error } = await supabase.from('prayer_requests').insert({ body, user_id: user.id });
  if (error) return { message: 'Couldn\'t send it. Check your connection and try again.' };
  return { ok: true, message: 'Sent. Your committee head and the admin will pray with you.', reset: Date.now() };
}

export async function deletePrayerRequest(formData) {
  const id = String(formData.get('id'));
  if (!isUuid(id)) return;
  const { supabase } = await requireMember();
  await supabase.from('prayer_requests').delete().eq('id', id);
}
