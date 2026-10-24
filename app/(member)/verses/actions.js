'use server';
import { requireMember } from '@/lib/auth';
import { VERSES } from '@/lib/memory-verses';

const KNOWN = new Set(VERSES);

/** Mark or unmark a verse as memorised. Private to the member (RLS). */
export async function toggleMemorised(_prev, formData) {
  const ref = String(formData.get('verse_ref') || '');
  const memorised = formData.get('memorised') === '1';
  if (!KNOWN.has(ref)) return { message: 'That verse isn\'t in this year\'s list.' };
  const { supabase, user } = await requireMember();
  const { error } = memorised
    ? await supabase.from('memorised_verses').delete().eq('user_id', user.id).eq('verse_ref', ref)
    : await supabase.from('memorised_verses').upsert({ user_id: user.id, verse_ref: ref }, { onConflict: 'user_id,verse_ref', ignoreDuplicates: true });
  if (error) {
    console.error('[memorised] save failed', { code: error.code });
    return { message: 'Couldn\'t save. Check your connection and try again.' };
  }
  return { ok: true, memorised: !memorised };
}
