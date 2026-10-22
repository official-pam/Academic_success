import Link from 'next/link';
import { requireMember, firstName } from '@/lib/auth';
import { lagosToday, weekDays, addDays, formatDay, formatTime, relativeDue, greeting, formatDateTime } from '@/lib/dates';
import { CheckIn } from '@/components/CheckIn';
import { levelLabel } from '@/lib/constants';

export const metadata = { title: 'Today' };

export default async function TodayPage({ searchParams }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireMember();
  const today = lagosToday();
  const days = weekDays(today);

  const [goalRes, recentRes, todayRes, sessionsRes, assignmentRes, announcementRes] = await Promise.all([
    supabase.from('goals').select('title, days_per_week, minutes_per_day').eq('active', true).maybeSingle(),
    supabase.from('checkins').select('day').gte('day', addDays(today, -60)).order('day', { ascending: false }).limit(61),
    supabase.from('checkins').select('id, minutes, note, created_at').eq('day', today).maybeSingle(),
    supabase.from('study_sessions').select('id, kind, title, start_time, duration_min, done_at').eq('starts_on', today).order('start_time', { ascending: true, nullsFirst: false }),
    supabase.from('assignments').select('id, title, due_at, level').eq('status', 'published').gte('due_at', new Date().toISOString()).order('due_at').limit(1).maybeSingle(),
    supabase.from('announcements').select('id, title, published_at').eq('status', 'published').order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const loadFailed = [goalRes, recentRes, todayRes].some((r) => r.error);
  const goal = goalRes.data;
  const recentDays = (recentRes.data || []).map((r) => r.day);
  const weekRead = recentDays.filter((d) => d >= days[0]);
  const sessions = sessionsRes.data || [];
  const nextAssignment = assignmentRes.data;
  const latest = announcementRes.data;

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-12">
      <div className="grid content-start gap-8">
        <div>
          <p className="text-sm text-muted">
            {greeting()}, {firstName(profile)} · {formatDay(today)}
          </p>
          {goal ? (
            <>
              <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-[2rem] md:leading-tight">{goal.title}</h1>
              <p className="mt-2 text-base text-muted">
                {goal.minutes_per_day ? `${goal.minutes_per_day} minutes a day · ` : ''}
                {goal.days_per_week === 7 ? 'every day' : `${goal.days_per_week} days a week`} ·{' '}
                <Link href="/plan#goal" className="font-medium text-ink underline underline-offset-4">Change</Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">Set a reading goal</h1>
              <p className="mt-2 text-base">A small daily target is easier to keep. <Link href="/plan#goal" className="font-semibold underline underline-offset-4">Set your goal</Link></p>
            </>
          )}
          {welcome && (
            <p role="status" className="mt-4 rounded-md bg-sage-wash px-3 py-2 text-sm text-sage-ink">
              You're set up. Tap "I read today" whenever you've done your reading.
            </p>
          )}
        </div>

        {loadFailed ? (
          <div role="alert" className="panel grid gap-2 p-5">
            <p className="font-semibold">Couldn't load today's reading.</p>
            <p className="text-sm text-muted">Check your connection. Your check-ins are safe.</p>
            <Link href="/today" className="btn btn-outline justify-self-start">Retry</Link>
          </div>
        ) : (
          <CheckIn
            userId={user.id}
            today={today}
            todayCheckin={todayRes.data}
            weekDays={days}
            weekRead={weekRead}
            recentDays={recentDays}
            goalDays={goal?.days_per_week ?? 5}
            since={lagosToday(new Date(user.created_at))}
          />
        )}

        <section aria-labelledby="today-plan">
          <div className="flex items-baseline justify-between">
            <h2 id="today-plan" className="text-base font-bold">On your plan today</h2>
            <Link href="/plan" className="text-sm font-medium underline underline-offset-4">Open plan</Link>
          </div>
          {sessions.length ? (
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-baseline gap-4 py-3">
                  <span className="num w-20 shrink-0 text-sm text-muted">{s.start_time ? formatTime(s.start_time) : 'Any time'}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`font-semibold ${s.done_at ? 'text-muted line-through' : ''}`}>{s.title}</span>
                    <span className="block text-sm text-muted">
                      {s.kind === 'exam' ? 'Exam' : 'Reading'}{s.duration_min ? ` · ${s.duration_min} min` : ''}{s.done_at ? ' · done' : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 border-y border-rule py-3 text-sm text-muted">
              Nothing scheduled. <Link href="/plan#add" className="font-medium text-ink underline underline-offset-4">Add a study session</Link>
            </p>
          )}
        </section>
      </div>

      <aside className="grid content-start gap-6 md:pt-10" aria-label="Coming up">
        <section className="panel p-4" aria-labelledby="next-deadline">
          <h2 id="next-deadline" className="text-sm font-semibold text-muted">Next deadline</h2>
          {nextAssignment ? (
            <Link href={`/assignments/${nextAssignment.id}`} className="mt-2 block rounded hover:underline">
              <span className="block font-bold">{nextAssignment.title}</span>
              <span className="mt-1 block text-sm">
                Due {relativeDue(nextAssignment.due_at)} · {formatDateTime(nextAssignment.due_at, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </Link>
          ) : (
            <p className="mt-2 text-sm">No assignments due for {levelLabel(profile.level)} right now.</p>
          )}
        </section>
        <section className="panel p-4" aria-labelledby="latest-update">
          <h2 id="latest-update" className="text-sm font-semibold text-muted">Latest from the committee</h2>
          {latest ? (
            <Link href={`/updates/${latest.id}`} className="mt-2 block rounded hover:underline">
              <span className="block font-bold">{latest.title}</span>
              <span className="mt-1 block text-sm">{formatDateTime(latest.published_at, { day: 'numeric', month: 'short' })}</span>
            </Link>
          ) : (
            <p className="mt-2 text-sm">No updates yet.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
