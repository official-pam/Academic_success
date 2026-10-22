'use server';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { resolveLevel, dbErrorMessage, isUuid } from '@/lib/admin';

export async function saveAnnouncement(_prev, formData) {
  const { supabase, profile } = await requireStaff();
  const id = String(formData.get('id') || '');
  const intent = String(formData.get('intent') || '');
  if (intent !== 'publish' && intent !== 'draft') return { message: 'Choose Publish or Save as draft.' };
  const values = {
    title: String(formData.get('title') || '').trim(),
    body: String(formData.get('body') || '').trim(),
    level: String(formData.get('level') ?? ''),
    pinned: formData.get('pinned') === 'on',
  };
  const errors = {};
  if (values.title.length < 3 || values.title.length > 140) errors.title = 'Give it a title of 3 to 140 characters.';
  if (!values.body) errors.body = 'Write the announcement.';
  else if (values.body.length > 4000) errors.body = 'Keep it under 4,000 characters.';
  const level = resolveLevel(profile, values.level);
  if (level === undefined) errors.level = 'Choose a level.';
  if (Object.keys(errors).length) return { errors, values };
  const row = { title: values.title, body: values.body, level, pinned: values.pinned, ...(intent === 'publish' ? { status: 'published' } : {}) };
  if (id) {
    if (!isUuid(id)) return { message: 'Unknown announcement.' };
    const { data, error } = await supabase.from('announcements').update(row).eq('id', id).select('id').maybeSingle();
    if (error || !data) return { message: dbErrorMessage(error) || 'This item is unavailable or you no longer have permission to edit it.', values };
  } else {
    const key = String(formData.get('client_key') || '');
    const { error } = await supabase.from('announcements').insert({ ...row, status: intent === 'publish' ? 'published' : 'draft', client_key: isUuid(key) ? key : null });
    if (error && error.code !== '23505') return { message: dbErrorMessage(error), values };
  }
  redirect(`/admin/announcements?status=${intent === 'publish' ? 'published' : 'draft'}&saved=1`);
}

export async function setAnnouncementStatus(formData) {
  const { supabase } = await requireStaff();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (!isUuid(id) || !['draft', 'published', 'archived'].includes(status)) return;
  const { data, error } = await supabase.from('announcements').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Could not change this item. Please try again.');
}
