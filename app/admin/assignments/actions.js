'use server';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { lagosToISO, resolveLevel, resolveSchool, dbErrorMessage, isUuid } from '@/lib/admin';

export async function saveAssignment(_prev, formData) {
  const { supabase, profile } = await requireStaff();
  const id = String(formData.get('id') || '');
  const intent = String(formData.get('intent') || '');
  if (intent !== 'publish' && intent !== 'draft') return { message: 'Choose Publish or Save as draft.' };
  const values = {
    title: String(formData.get('title') || '').trim(),
    instructions: String(formData.get('instructions') || '').trim(),
    resources: String(formData.get('resources') || '').trim(),
    due_date: String(formData.get('due_date') || ''),
    due_time: String(formData.get('due_time') || ''),
    level: String(formData.get('level') ?? ''),
    school_code: String(formData.get('school_code') ?? ''),
    department: String(formData.get('department') || '').trim(),
  };
  const errors = {};
  if (values.title.length < 3 || values.title.length > 140) errors.title = 'Give it a title of 3 to 140 characters.';
  if (values.instructions.length > 4000) errors.instructions = 'Keep instructions under 4,000 characters.';
  if (values.resources.length > 2000) errors.resources = 'Keep resources under 2,000 characters.';
  const due_at = lagosToISO(values.due_date, values.due_time);
  if (!due_at) errors.due_date = 'Choose a deadline date.';
  else if (new Date(due_at) <= new Date()) errors.due_date = 'The deadline must be in the future.';
  const level = resolveLevel(profile, values.level);
  if (level === undefined) errors.level = 'Choose a level.';
  const school_code = resolveSchool(profile, values.school_code);
  if (school_code === undefined) errors.school_code = 'Choose a school.';
  if (values.department && (values.department.length < 2 || values.department.length > 80)) errors.department = 'Use a department name, or leave it empty for all.';
  if (Object.keys(errors).length) return { errors, values };

  const row = {
    title: values.title,
    instructions: values.instructions,
    resources: values.resources,
    due_at,
    level,
    school_code,
    department: values.department || null,
    ...(intent === 'publish' ? { status: 'published' } : {}),
  };

  if (id) {
    if (!isUuid(id)) return { message: 'Unknown assignment.' };
    const { data, error } = await supabase.from('assignments').update(row).eq('id', id).select('id').maybeSingle();
    if (error || !data) return { message: dbErrorMessage(error) || 'This item is unavailable or you no longer have permission to edit it.', values };
  } else {
    const client_key = String(formData.get('client_key') || '');
    const { error } = await supabase.from('assignments').insert({ ...row, status: intent === 'publish' ? 'published' : 'draft', client_key: isUuid(client_key) ? client_key : null });
    // 23505 on client_key = this exact form was already submitted (double tap or retry): treat as done.
    if (error && error.code !== '23505') return { message: dbErrorMessage(error), values };
  }
  redirect(`/admin/assignments?status=${intent === 'publish' ? 'published' : 'draft'}&saved=1`);
}

export async function setAssignmentStatus(formData) {
  const { supabase } = await requireStaff();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (!isUuid(id) || !['draft', 'published', 'archived'].includes(status)) return;
  const { data, error } = await supabase.from('assignments').update({ status }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Could not change this item. Please try again.');
}
