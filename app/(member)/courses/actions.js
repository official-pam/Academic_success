'use server';
import { requireMember } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { GRADES } from '@/lib/grades';

const SESSION = /^[0-9]{4}\/[0-9]{4}$/;

function term(formData) {
  const session = String(formData.get('session') || '');
  const semester = Number(formData.get('semester'));
  if (!SESSION.test(session) || ![1, 2].includes(semester)) return null;
  return { session, semester };
}

function fail(error, fallback) {
  if (error?.code === '23505') return { message: 'That course is already on your list for this semester.' };
  if (error?.code === '22023') return { message: error.message };
  console.error('[courses]', { code: error?.code });
  return { message: fallback };
}

/** Enrol in a catalogue course (course_id) or a course typed in by hand (code, title, units). */
export async function enrolCourse(_prev, formData) {
  const t = term(formData);
  if (!t) return { message: 'Choose the session and semester first.' };
  const { supabase, profile } = await requireMember();
  const courseId = String(formData.get('course_id') || '');
  let row;
  if (isUuid(courseId)) {
    // Code, title and units are filled in by the database from the catalogue.
    row = { course_id: courseId, course_code: 'PENDING', course_title: 'From catalogue', credit_units: 0 };
  } else {
    const code = String(formData.get('course_code') || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const title = String(formData.get('course_title') || '').trim().replace(/\s+/g, ' ');
    const units = Number(formData.get('credit_units'));
    const errors = {};
    if (!/^[A-Z][A-Z-]{1,9} ?[0-9]{3}[A-Z]?$/.test(code)) errors.course_code = 'Use a course code like EEE 301.';
    if (title.length < 2 || title.length > 200) errors.course_title = 'Enter the course title.';
    if (!Number.isInteger(units) || units < 0 || units > 15) errors.credit_units = 'Units from 0 to 15.';
    if (Object.keys(errors).length) return { errors, manual: true };
    row = { course_code: code, course_title: title, credit_units: units };
  }
  const { error } = await supabase.from('enrolments').insert({ ...row, ...t, user_id: profile.id });
  if (error) return fail(error, 'Couldn\'t add the course. Try again.');
  return { ok: true, message: 'Course added.', reset: Date.now() };
}

/** Target grade and a realistic goal for one course. */
export async function saveTarget(_prev, formData) {
  const id = String(formData.get('id'));
  const target = String(formData.get('target_grade') || '');
  const goal = String(formData.get('goal') || '').trim().slice(0, 300);
  if (!isUuid(id)) return { message: 'Unknown course.' };
  if (target && !GRADES.includes(target)) return { message: 'Choose a grade.' };
  const { supabase } = await requireMember();
  const { error } = await supabase.from('enrolments').update({ target_grade: target || null, goal: goal || null }).eq('id', id);
  if (error) return fail(error, 'Couldn\'t save your target.');
  return { ok: true, message: 'Target saved.' };
}

/** Result: a score (0-100, converted to a grade) or a grade on its own. Empty clears it. */
export async function saveResult(_prev, formData) {
  const id = String(formData.get('id'));
  const scoreRaw = String(formData.get('score') || '').trim();
  const gradeRaw = String(formData.get('grade') || '');
  if (!isUuid(id)) return { message: 'Unknown course.' };
  let update;
  if (scoreRaw) {
    const score = Number(scoreRaw);
    if (!(score >= 0 && score <= 100)) return { message: 'Scores are from 0 to 100.' };
    update = { score: Math.round(score * 100) / 100, grade: null };
  } else if (gradeRaw) {
    if (!GRADES.includes(gradeRaw)) return { message: 'Choose a grade.' };
    update = { score: null, grade: gradeRaw };
  } else {
    update = { score: null, grade: null };
  }
  const { supabase } = await requireMember();
  const { error } = await supabase.from('enrolments').update(update).eq('id', id);
  if (error) return fail(error, 'Couldn\'t save the result.');
  return { ok: true, message: update.score === null && update.grade === null ? 'Result cleared.' : 'Result saved.' };
}

export async function removeEnrolment(formData) {
  const id = String(formData.get('id'));
  if (!isUuid(id)) return;
  const { supabase } = await requireMember();
  await supabase.from('enrolments').delete().eq('id', id);
}

/** CGPA and units from before the member started recording results here. */
export async function savePrior(_prev, formData) {
  const cgpaRaw = String(formData.get('prior_cgpa') || '').trim();
  const unitsRaw = String(formData.get('prior_units') || '').trim();
  const { supabase, user } = await requireMember();
  let update = { prior_cgpa: null, prior_units: null };
  if (cgpaRaw || unitsRaw) {
    const c = Number(cgpaRaw), u = Number(unitsRaw);
    if (!(c >= 0 && c <= 5)) return { errors: { prior_cgpa: 'A CGPA from 0.00 to 5.00.' } };
    if (!Number.isInteger(u) || u < 1 || u > 400) return { errors: { prior_units: 'Total credit units you\'ve completed, e.g. 96.' } };
    update = { prior_cgpa: Math.round(c * 100) / 100, prior_units: u };
  }
  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) return fail(error, 'Couldn\'t save.');
  return { ok: true, message: 'Saved.' };
}
