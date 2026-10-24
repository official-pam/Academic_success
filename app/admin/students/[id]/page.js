import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { levelLabel } from '@/lib/constants';
import { addDays, lagosToday, formatDateTime, formatDay, formatTime } from '@/lib/dates';
import { gpa, cgpa, currentSession, currentSemester, fmtGpa, POINTS } from '@/lib/grades';
import { GradeSummary } from '@/components/GradeSummary';

export const metadata = { title: 'Student progress' };

const GRADE_TONE = { A: 'bg-sage-wash text-sage-ink', B: 'bg-sage-wash text-sage-ink', C: 'bg-slate-wash text-slate-ink', D: 'bg-rose-wash text-rose-ink', E: 'bg-rose-wash text-rose-ink', F: 'bg-danger-wash text-danger' };

/** One student's full study record, for their committee head (mentor) and the admin. RLS enforces the scope. */
export default async function StudentPage({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireStaff();
  const { data: p } = await supabase.from('profiles')
    .select('id, full_name, level, school_code, department, prior_cgpa, prior_units, onboarded_at').eq('id', id).maybeSingle();
  if (!p) notFound(); // not in this viewer's scope, or doesn't exist

  const today = lagosToday();
  const since30 = addDays(today, -29);
  const [enrolRes, focusRes, plannedRes, daysRes] = await Promise.all([
    supabase.from('enrolments').select('id, course_code, course_title, credit_units, session, semester, target_grade, goal, score, grade, result_entered_at').eq('user_id', id).order('session', { ascending: false }).order('semester', { ascending: false }).order('course_code').limit(500),
    supabase.from('focus_sessions').select('id, label, planned_min, actual_min, completed, started_at, ended_at').eq('user_id', id).order('ended_at', { ascending: false }).limit(20),
    supabase.from('study_sessions').select('id, kind, title, starts_on, start_time, duration_min, done_at').eq('user_id', id).gte('starts_on', addDays(today, -14)).order('starts_on').limit(40),
    supabase.rpc('member_checkin_days', { p_members: [id], p_from: since30 }),
  ]);
  const all = enrolRes.data || [];
  const term = { session: currentSession(), semester: currentSemester() };
  const thisTerm = all.filter((e) => e.session === term.session && e.semester === term.semester);
  const total = cgpa(all, p);
  const focus = focusRes.data || [];
  const focus7 = focus.filter((f) => new Date(f.ended_at) >= new Date(`${addDays(today, -6)}T00:00:00+01:00`));
  const days = new Set((daysRes.data || []).map((d) => d.day));
  const terms = [...new Set(all.map((e) => `${e.session}|${e.semester}`))];
  const planned = plannedRes.data || [];
  const missed = planned.filter((s) => s.kind === 'reading' && s.starts_on < today && !s.done_at);

  return (
    <div className="grid gap-8">
      <div>
        <Link href="/admin/students" className="text-sm font-medium underline underline-offset-4">← Students</Link>
        <h1 className="display mt-3 text-[2.25rem] leading-[1.08]">{p.full_name}</h1>
        <p className="mt-1 text-sm text-muted">{[p.school_code, levelLabel(p.level), p.department].filter(Boolean).join(' · ')}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Focus, last 7 days', `${focus7.reduce((n, f) => n + f.actual_min, 0)} min`, `${focus7.length} ${focus7.length === 1 ? 'session' : 'sessions'}`],
          ['Check-ins, last 30 days', `${days.size} days`, 'self-reported reading'],
          ['Courses this semester', String(thisTerm.length), `${thisTerm.reduce((n, e) => n + e.credit_units, 0)} units`],
          ['Missed plans, 2 weeks', String(missed.length), 'reading sessions not done'],
        ].map(([k, v, sub]) => (
          <div key={k} className="panel p-4">
            <dt className="text-xs font-semibold text-muted">{k}</dt>
            <dd className="num mt-1 text-xl font-bold">{v}</dd>
            <dd className="text-xs text-muted">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="courses-h" className="grid content-start gap-4">
          <h2 id="courses-h" className="text-lg font-bold">Courses, targets and results</h2>
          {!terms.length && <p className="text-sm text-muted">No courses recorded yet.</p>}
          {terms.map((t) => {
            const [session, semester] = t.split('|');
            const rows = all.filter((e) => e.session === session && String(e.semester) === semester);
            return (
              <div key={t} className="panel overflow-x-auto p-1">
                <p className="px-4 pt-3 text-sm font-semibold">
                  {session}, {semester === '1' ? 'first' : 'second'} semester
                  <span className="font-normal text-muted"> · GPA {fmtGpa(gpa(rows).value)} · target {fmtGpa(gpa(rows, 'target_grade').value)}</span>
                </p>
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th scope="col" className="px-4 py-2 font-semibold">Course</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Units</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Target and goal</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e) => {
                      const below = e.grade && e.target_grade && POINTS[e.grade] < POINTS[e.target_grade];
                      return (
                        <tr key={e.id} className="border-t border-rule align-top">
                          <th scope="row" className="px-4 py-2.5 text-left font-normal"><span className="font-semibold">{e.course_code}</span><span className="block text-xs text-muted">{e.course_title}</span></th>
                          <td className="num px-3 py-2.5 text-right">{e.credit_units}</td>
                          <td className="px-3 py-2.5">{e.target_grade ? <strong>{e.target_grade}</strong> : <span className="text-muted">—</span>}{e.goal && <span className="block text-xs text-muted">{e.goal}</span>}</td>
                          <td className="px-4 py-2.5 text-right">
                            {e.grade ? <span className={`chip ${GRADE_TONE[e.grade]}`}>{e.grade}{e.score !== null ? ` · ${Number(e.score)}` : ''}</span> : <span className="text-muted">—</span>}
                            {below && <span className="block text-xs text-rose-ink">below target</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        <aside className="grid content-start gap-6">
          <GradeSummary title="Results overview" semesterGpa={gpa(thisTerm).value} targetGpa={gpa(thisTerm, 'target_grade').value} cgpaValue={total.value} cgpaUnits={total.units} rows={all} />

          <section aria-labelledby="focus-h" className="panel p-5">
            <h2 id="focus-h" className="text-base font-bold">Recent focus sessions</h2>
            {focus.length ? (
              <ul className="mt-2 divide-y divide-rule">
                {focus.map((f) => (
                  <li key={f.id} className="py-2.5 text-sm">
                    <span className="block font-semibold">{f.label}</span>
                    <span className="text-xs text-muted">
                      {formatDateTime(f.started_at)} – {formatDateTime(f.ended_at, { hour: 'numeric', minute: '2-digit' })} · <span className="num">{f.actual_min}</span> of {f.planned_min} min{f.completed ? '' : ' · stopped early'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">No focus sessions yet.</p>}
          </section>

          <section aria-labelledby="plan-h" className="panel p-5">
            <h2 id="plan-h" className="text-base font-bold">Planned sessions</h2>
            {planned.length ? (
              <ul className="mt-2 divide-y divide-rule">
                {planned.map((s) => {
                  const state = s.done_at ? 'done' : s.starts_on < today && s.kind === 'reading' ? 'missed' : s.kind === 'exam' ? 'exam' : 'planned';
                  return (
                    <li key={s.id} className="py-2.5 text-sm">
                      <span className="block font-semibold">{s.title}</span>
                      <span className="text-xs text-muted">
                        {formatDay(s.starts_on, { weekday: 'short', day: 'numeric', month: 'short' })}{s.start_time ? ` · ${formatTime(s.start_time)}` : ''} ·{' '}
                        <span className={state === 'missed' ? 'font-semibold text-danger' : state === 'done' ? 'text-sage-ink' : ''}>{state}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">Nothing planned in the last two weeks or ahead.</p>}
          </section>
        </aside>
      </div>
      <p className="text-xs text-muted">Check-in notes and memorised verses stay private to the student and aren't shown here.</p>
    </div>
  );
}
