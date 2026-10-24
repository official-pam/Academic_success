import 'server-only';
import { addDays, lagosToday } from '@/lib/dates';
import { cgpa } from '@/lib/grades';

/**
  Progress for a page of students (ids), using only what RLS lets the viewer read:
  focus minutes and check-in days in the last 7 days, courses this term, and CGPA.
*/
export async function summarise(supabase, people, { session, semester }) {
  const ids = people.map((p) => p.id);
  if (!ids.length) return {};
  const since = addDays(lagosToday(), -6);
  const [focus, days, enrol] = await Promise.all([
    supabase.from('focus_sessions').select('user_id, actual_min, ended_at').in('user_id', ids).gte('ended_at', new Date(`${since}T00:00:00+01:00`).toISOString()).limit(5000),
    supabase.rpc('member_checkin_days', { p_members: ids, p_from: since }),
    supabase.from('enrolments').select('user_id, credit_units, grade, target_grade, session, semester').in('user_id', ids).limit(5000),
  ]);
  const out = Object.fromEntries(people.map((p) => [p.id, { minutes: 0, sessions: 0, days: 0, courses: 0, results: 0, cgpa: null, lastFocus: null }]));
  for (const f of focus.data || []) {
    const o = out[f.user_id];
    o.minutes += f.actual_min;
    o.sessions += 1;
    if (!o.lastFocus || f.ended_at > o.lastFocus) o.lastFocus = f.ended_at;
  }
  for (const d of days.data || []) out[d.user_id].days += 1;
  const byUser = {};
  for (const e of enrol.data || []) (byUser[e.user_id] ||= []).push(e);
  for (const p of people) {
    const rows = byUser[p.id] || [];
    out[p.id].courses = rows.filter((e) => e.session === session && e.semester === semester).length;
    out[p.id].results = rows.filter((e) => e.grade).length;
    out[p.id].cgpa = cgpa(rows, p).value;
  }
  return out;
}
