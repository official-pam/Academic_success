'use server';
import { requireMember } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { isDay, isTime } from '@/lib/validation';
import { lagosToday, addDays } from '@/lib/dates';



export async function setGoal(_prev, formData) {
  const title = String(formData.get('title') || '').trim();
  const days = Number(formData.get('days_per_week'));
  const minutesRaw = String(formData.get('minutes_per_day') || '').trim();
  const minutes = minutesRaw ? Number(minutesRaw) : null;
  const errors = {};
  if (title.length < 2 || title.length > 120) errors.title = 'Describe the goal in a few words, e.g. "Read 2 chapters".';
  if (!Number.isInteger(days) || !(days >= 1 && days <= 7)) errors.days_per_week = 'Choose 1 to 7 days.';
  if (minutes !== null && (!Number.isInteger(minutes) || !(minutes >= 5 && minutes <= 600))) errors.minutes_per_day = 'Use 5 to 600 minutes, or leave it empty.';
  if (Object.keys(errors).length) return { errors };
  const { supabase } = await requireMember();
  const { error } = await supabase.rpc('set_goal', { p_title: title, p_days_per_week: days, p_minutes_per_day: minutes });
  if (error) return { message: 'Couldn\'t save your goal. Try again.' };
  return { ok: true, message: 'Goal updated. Your earlier goals and check-ins are kept.' };
}

export async function addSession(_prev, formData) {
  const kind = formData.get('kind') === 'exam' ? 'exam' : 'reading';
  const title = String(formData.get('title') || '').trim();
  const starts_on = String(formData.get('starts_on') || '');
  const start_time = String(formData.get('start_time') || '') || null;
  const durRaw = String(formData.get('duration_min') || '').trim();
  const duration_min = durRaw ? Number(durRaw) : null;
  const errors = {};
  if (title.length < 2 || title.length > 120) errors.title = kind === 'exam' ? 'Name the exam, e.g. "CHM 201".' : 'Name what you\'ll read, e.g. "MTH 101 chapter 3".';
  if (!isDay(starts_on)) errors.starts_on = 'Choose a date.';
  else if (starts_on < addDays(lagosToday(), -1)) errors.starts_on = 'Choose today or a later date.';
  if (start_time && !isTime(start_time)) errors.start_time = 'Use a time like 16:00.';
  if (duration_min !== null && (!Number.isInteger(duration_min) || !(duration_min >= 5 && duration_min <= 600))) errors.duration_min = 'Use 5 to 600 minutes.';
  if (Object.keys(errors).length) return { errors, values: { kind, title, starts_on, start_time, duration_min } };
  const { supabase } = await requireMember();
  const { error } = await supabase.from('study_sessions').insert({ kind, title, starts_on, start_time, duration_min });
  if (error) return { message: 'Couldn\'t add it. Try again.', values: { kind, title, starts_on, start_time, duration_min } };
  return { ok: true, message: kind === 'exam' ? 'Exam added to your plan.' : 'Session added to your plan.', reset: Date.now() };
}

export async function toggleSessionDone(formData) {
  const id = String(formData.get('id'));
  const isDone = formData.get('done') === '1';
  const { supabase } = await requireMember();
  if (!isUuid(id)) throw new Error('Unknown session.');
  const { data, error } = await supabase.from('study_sessions').update({ done_at: isDone ? null : new Date().toISOString() }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Could not update this session. Please try again.');
  return { ok: true };
}

export async function moveSession(formData) {
  const id = String(formData.get('id'));
  const starts_on = String(formData.get('starts_on') || '');
  const start_time = String(formData.get('start_time') || '') || null;
  if (!isDay(starts_on) || (start_time && !isTime(start_time))) return;
  const { supabase } = await requireMember();
  if (!isUuid(id)) throw new Error('Unknown session.');
  const { data, error } = await supabase.from('study_sessions').update({ starts_on, start_time, done_at: null }).eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Could not move this session. Please try again.');
}

export async function deleteSession(formData) {
  const { supabase } = await requireMember();
  const id = String(formData.get('id'));
  if (!isUuid(id)) throw new Error('Unknown session.');
  const { data, error } = await supabase.from('study_sessions').delete().eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('Could not delete this session. Please try again.');
}
