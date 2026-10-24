import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { currentSession, currentSemester } from '@/lib/grades';
import { formatDateTime } from '@/lib/dates';
import { FocusTimer } from './FocusTimer';

export const metadata = { title: 'Focus timer' };

export default async function FocusPage({ searchParams }) {
  const { enrolment } = await searchParams;
  const { supabase, user } = await requireMember();
  const [coursesRes, recentRes] = await Promise.all([
    supabase.from('enrolments').select('id, course_code, course_title')
      .eq('user_id', user.id).eq('session', currentSession()).eq('semester', currentSemester()).order('course_code'),
    supabase.from('focus_sessions').select('id, label, actual_min, completed, ended_at').eq('user_id', user.id).order('ended_at', { ascending: false }).limit(10),
  ]);
  const courses = coursesRes.data || [];
  const recent = recentRes.data || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const weekMinutes = recent.filter((r) => new Date(r.ended_at).getTime() >= weekAgo).reduce((n, r) => n + r.actual_min, 0);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-10">
      <div className="grid content-start gap-6">
        <div>
          <p className="text-sm text-muted">Phones away, one course at a time.</p>
          <h1 className="display mt-1 text-[2.25rem] leading-[1.08]">Focus timer.</h1>
        </div>
        {!courses.length && (
          <p className="notice">Add this semester's courses in <Link href="/courses" className="font-semibold underline">Courses</Link> to time each one. You can still time general reading.</p>
        )}
        <FocusTimer userId={user.id} courses={courses} initialEnrolment={courses.some((c) => c.id === enrolment) ? enrolment : undefined} />
      </div>
      <aside className="grid content-start gap-4 md:pt-[4.5rem]">
        <section className="panel p-5" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-base font-bold">Recent sessions</h2>
          <p className="mt-1 text-sm text-muted"><span className="num font-semibold text-ink">{weekMinutes}</span> min in the last 7 days (latest 10 sessions)</p>
          {recent.length ? (
            <ul className="mt-3 divide-y divide-rule">
              {recent.map((r) => (
                <li key={r.id} className="py-2.5 text-sm">
                  <span className="block font-semibold">{r.label}</span>
                  <span className="text-xs text-muted">{formatDateTime(r.ended_at)} · <span className="num">{r.actual_min}</span> min{r.completed ? '' : ' · stopped early'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Your finished sessions appear here.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
