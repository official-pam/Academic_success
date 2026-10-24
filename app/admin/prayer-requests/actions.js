'use server';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/admin';

/** Mark (or unmark) a prayer request as prayed for. The database checks the member is in this committee member's scope. */
export async function markPrayed(formData) {
  const id = String(formData.get('id'));
  if (!isUuid(id)) return;
  const { supabase } = await requireStaff();
  await supabase.rpc('mark_prayer_request', { p_id: id, p_prayed: formData.get('prayed') === '1' });
}
