'use server';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { dbErrorMessage, isUuid } from '@/lib/admin';
import { isDay } from '@/lib/validation';
import { weekStart } from '@/lib/dates';

export async function savePrayerPoints(_prev, formData) {
  const { supabase } = await requireStaff();
  const id = String(formData.get('id') || '');
  const intent = String(formData.get('intent') || '');
  if (intent !== 'publish' && intent !== 'draft') return { message: 'Choose Publish or Save as draft.' };
  const values = {
    week_of: String(formData.get('week_of') || ''),
    points: String(formData.get('points') || ''),
    scripture: String(formData.get('scripture') || '').trim(),
  };
  const points = values.points.split('\n').map((p) => p.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
  const errors = {};
  if (!isDay(values.week_of)) errors.week_of = 'Choose the week.';
  if (!points.length) errors.points = 'Add at least one prayer point, one per line.';
  else if (points.length > 12) errors.points = 'Keep it to 12 points or fewer.';
  else if (points.some((p) => p.length > 400)) errors.points = 'Each point should be under 400 characters.';
  if (values.scripture.length > 200) errors.scripture = 'Keep the scripture reference short.';
  if (Object.keys(errors).length) return { errors, values };
  const row = { week_of: weekStart(values.week_of), points, scripture: values.scripture || null, ...(intent === 'publish' ? { status: 'published' } : {}) };
  if (id) {
    if (!isUuid(id)) return { message: 'Unknown entry.' };
    const { data, error } = await supabase.from('prayer_points').update(row).eq('id', id).select('id').maybeSingle();
    if (error || !data) return { message: dbErrorMessage(error) || 'This item is unavailable or you no longer have permission to edit it.', values };
  } else {
    const key = String(formData.get('client_key') || '');
    const { error } = await supabase.from('prayer_points').insert({ ...row, status: intent === 'publish' ? 'published' : 'draft', client_key: isUuid(key) ? key : null });
    if (error && error.code !== '23505') return { message: dbErrorMessage(error), values };
  }
  redirect(`/admin/prayer-points?status=${intent === 'publish' ? 'published' : 'draft'}&saved=1`);
}

export async function setPrayerStatus(formData) {
  const { supabase } = await requireStaff();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (!isUuid(id) || !['draft', 'published', 'archived'].includes(status)) return;
  const { data, error } = await supabase.from('prayer_points').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Could not change this item. Please try again.');
}
