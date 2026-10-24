import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { levelLabel } from '@/lib/constants';
import { gpa, cgpa, currentSession, currentSemester, recentSessions } from '@/lib/grades';
import { GradeSummary } from '@/components/GradeSummary';
import { CoursePicker } from './CoursePicker';
import { EnrolmentCard } from './EnrolmentCard';
import { PriorForm } from './PriorForm';

export const metadata = { title: 'Courses' };

export default async function CoursesPage({ searchParams }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireMember();
  const sessions = recentSessions();
  const session = sessions.includes(sp.session) ? sp.session : currentSession();
  const semester = [1, 2].includes(Number(sp.semester)) ? Number(sp.semester) : currentSemester();

  if (!profile.programme_id) {
    return (
      <div className="grid max-w-xl gap-6">
        <h1 className="display text-[2.25rem] leading-[1.08]">Your courses.</h1>
        <div className="card-lavender grid gap-3 p-6">
          <h2 className="text-lg font-bold">Choose your school and programme first</h2>
          <p className="text-sm">Your course list comes from your programme. Set it once in Profile and it fills in here.</p>
          <Link href="/profile" className="btn btn-accent justify-self-start">Go to Profile <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    );
  }

  const [catalogueRes, enrolRes, focusRes] = await Promise.all([
    supabase.from('courses').select('id, code, title, credit_units, level, semester, status').eq('programme_id', profile.programme_id).order('level').order('code').limit(400),
    supabase.from('enrolments').select('id, course_code, course_title, credit_units, session, semester, target_grade, goal, score, grade').eq('user_id', profile.id).order('course_code').limit(500),
    supabase.from('focus_sessions').select('enrolment_id, actual_min').eq('user_id', profile.id).not('enrolment_id', 'is', null).limit(2000),
  ]);
  const all = enrolRes.data || [];
  const thisTerm = all.filter((e) => e.session === session && e.semester === semester);
  const focusBy = {};
  for (const f of focusRes.data || []) focusBy[f.enrolment_id] = (focusBy[f.enrolment_id] || 0) + f.actual_min;
  const termUnits = thisTerm.reduce((n, e) => n + (Number(e.credit_units) || 0), 0);
  const semGpa = gpa(thisTerm).value;
  const targetGpa = gpa(thisTerm, 'target_grade').value;
  const total = cgpa(all, profile);
  const catalogue = catalogueRes.data || [];

  const termHref = (s, m) => `/courses?session=${encodeURIComponent(s)}&semester=${m}`;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-10">
      <div className="grid content-start gap-6">
        <div>
          <p className="text-sm text-muted">{[profile.school_code, profile.department, levelLabel(profile.level)].filter(Boolean).join(' · ')}</p>
          <h1 className="display mt-1 text-[2.25rem] leading-[1.08]">Your courses.</h1>
        </div>

        <nav aria-label="Semester" className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex items-center gap-2" action="/courses">
              <label htmlFor="session" className="sr-only">Session</label>
              <select id="session" name="session" defaultValue={session} className="input min-h-10 w-auto py-0 text-sm">
                {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="hidden" name="semester" value={semester} />
              <button className="btn btn-ghost min-h-10 px-3 text-sm">Go</button>
            </form>
            <div className="flex rounded-full bg-stone/60 p-1 text-sm">
              {[1, 2].map((m) => (
                <Link key={m} href={termHref(session, m)} aria-current={m === semester ? 'page' : undefined}
                  className={`rounded-full px-4 py-1.5 ${m === semester ? 'bg-surface font-bold text-ink shadow-sm' : 'text-muted'}`}>
                  {m === 1 ? 'First' : 'Second'} semester
                </Link>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted">
            <span className="num">{thisTerm.length}</span> {thisTerm.length === 1 ? 'course' : 'courses'} · <span className="num">{termUnits}</span> units this semester
          </p>
        </nav>

        <section aria-labelledby="enrol-heading" className="panel p-5">
          <h2 id="enrol-heading" className="sr-only">Enrol in a course</h2>
          {catalogueRes.error ? (
            <p role="alert" className="notice">Couldn't load your course list. Check your connection and try again.</p>
          ) : (
            <CoursePicker
              courses={catalogue}
              enrolledCodes={thisTerm.map((e) => e.course_code)}
              session={session}
              semester={semester}
              level={profile.level}
            />
          )}
          {!catalogue.length && !catalogueRes.error && (
            <p className="mt-3 text-sm text-muted">
              The committee hasn't loaded {profile.department}'s course list yet. Add your courses by hand for now.
            </p>
          )}
        </section>

        <section aria-labelledby="enrolled-heading" className="grid gap-3">
          <h2 id="enrolled-heading" className="text-base font-bold">This semester</h2>
          {enrolRes.error ? (
            <p role="alert" className="notice">Couldn't load your courses. Try again shortly.</p>
          ) : thisTerm.length ? (
            <ul className="grid gap-3">
              {thisTerm.map((e) => <EnrolmentCard key={e.id} e={e} focusMinutes={focusBy[e.id] || 0} />)}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-control)] border border-dashed border-stone px-4 py-3 text-sm text-muted">
              No courses for {session}, {semester === 1 ? 'first' : 'second'} semester yet. Add them above, then set a target for each.
            </p>
          )}
        </section>
      </div>

      <aside className="grid content-start gap-6 md:pt-[4.5rem]">
        <GradeSummary semesterGpa={semGpa} targetGpa={targetGpa} cgpaValue={total.value} cgpaUnits={total.units} rows={all} />
        <section aria-labelledby="prior-heading" className="panel grid gap-3 p-5">
          <h2 id="prior-heading" className="text-base font-bold">Before this app</h2>
          <PriorForm profile={profile} />
        </section>
        <p className="text-xs text-muted">
          Grades use the NUC CCMAS scale: A 70–100 (5), B 60–69 (4), C 50–59 (3), D 45–49 (2), F 0–44 (0). Your committee
          head and the admin can see your courses, targets and results. <Link href="/privacy" className="underline underline-offset-2">Who can see what</Link>
        </p>
      </aside>
    </div>
  );
}
