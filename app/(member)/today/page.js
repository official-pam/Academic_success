import Link from 'next/link';
import { requireMember, firstName } from '@/lib/auth';
import { lagosToday, weekDays, addDays, formatDay, formatTime, relativeDue, greeting, formatDateTime } from '@/lib/dates';
import { CheckIn } from '@/components/CheckIn';
import { levelLabel } from '@/lib/constants';
import { verseFor, verseIndexFor } from '@/lib/memory-verses';
import { VerseCard } from '@/components/VerseCard';
import { InstallApp } from '@/components/InstallApp';

export const metadata = { title: 'Today' };

export default async function TodayPage({ searchParams }) {
  const { welcome } = await searchParams;
  const { supabase, user, profile } = await requireMember();
  const today = lagosToday();
  const days = weekDays(today);

  const verse = verseFor(today);
  const [goalRes, recentRes, todayRes, sessionsRes, assignmentRes, announcementRes, memorisedRes] = await Promise.all([
    supabase.from('goals').select('title, days_per_week, minutes_per_day').eq('active', true).maybeSingle(),
    supabase.from('checkins').select('day').gte('day', addDays(today, -60)).order('day', { ascending: false }).limit(61),
    supabase.from('checkins').select('id, minutes, note, created_at').eq('day', today).maybeSingle(),
    supabase.from('study_sessions').select('id, kind, title, start_time, duration_min, done_at').eq('starts_on', today).order('start_time', { ascending: true, nullsFirst: false }),
    supabase.from('assignments').select('id, title, due_at, level').eq('status', 'published').gte('due_at', new Date().toISOString()).order('due_at').limit(1).maybeSingle(),
    supabase.from('announcements').select('id, title, published_at').eq('status', 'published').order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('memorised_verses').select('verse_ref').eq('verse_ref', verse.ref).maybeSingle(),
  ]);

  const loadFailed = [goalRes, recentRes, todayRes].some((r) => r.error);
  const goal = goalRes.data;
  const recentDays = (recentRes.data || []).map((r) => r.day);
  const weekRead = recentDays.filter((d) => d >= days[0]);
  const sessions = sessionsRes.data || [];
  const nextAssignment = assignmentRes.data;
  const latest = announcementRes.data;

  const nextSession = sessions.find((s) => !s.done_at);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-10">
      <div className="grid content-start gap-6">
        <div>
          <p className="text-sm text-muted">{greeting()}, {firstName(profile)}</p>
          <h1 className="display mt-1 text-[2.5rem] leading-[1.05] md:text-[3rem]">Make room<br />for focus.</h1>
          <p className="mt-2 text-sm text-muted">{formatDay(today)}</p>
          {welcome && (
            <p role="status" className="mt-4 rounded-[var(--radius-control)] bg-sage-wash px-4 py-3 text-sm text-sage-ink">
              You're set up. Tap "I read today" whenever you've done your reading.
            </p>
          )}
        </div>

        <InstallApp />

        <VerseCard verse={verse} index={verseIndexFor(today)} memorised={Boolean(memorisedRes.data)} />

        {/* Daily reading goal */}
        <section className="panel flex items-center gap-4 p-4" aria-labelledby="goal-heading">
          <span className="icon-tile bg-lavender-wash text-lavender-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="goal-heading" className="text-sm font-bold">{goal ? goal.title : 'Daily reading'}</h2>
            <p className="text-sm text-muted">
              {goal
                ? `${goal.minutes_per_day ? `${goal.minutes_per_day} min a day · ` : ''}${goal.days_per_week === 7 ? 'every day' : `${goal.days_per_week} days a week`}`
                : 'A small daily target is easier to keep.'}
            </p>
          </div>
          <Link href="/plan#goal" className="btn btn-ghost min-h-9 px-3 text-xs">{goal ? 'Change' : 'Set goal'}</Link>
        </section>

        <Link href="/focus" className="card-lavender flex items-center gap-4 p-4 hover:brightness-[0.98]">
          <span className="icon-tile bg-surface text-lavender-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.5M9.5 3h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Focus timer</span>
            <span className="block text-sm text-muted">Time a study session for one course. It rings when you're done.</span>
          </span>
          <span aria-hidden="true" className="text-lavender-ink">→</span>
        </Link>

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

        {/* Next up + today's plan */}
        <section className="panel p-4" aria-labelledby="today-plan">
          <div className="flex items-center gap-4">
            <span className="icon-tile bg-slate-wash text-slate-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v4M16 4v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="today-plan" className="text-xs font-semibold text-muted">{nextSession ? 'Next up' : 'On your plan today'}</h2>
              {nextSession ? (
                <p className="font-semibold">{nextSession.title}</p>
              ) : (
                <p className="text-sm">{sessions.length ? 'All done for today.' : 'Nothing scheduled.'}</p>
              )}
            </div>
            <Link href="/plan" className="text-sm font-semibold text-lavender-ink underline-offset-4 hover:underline">Plan</Link>
          </div>
          {sessions.length ? (
            <ul className="mt-4 grid gap-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-baseline gap-3 rounded-[var(--radius-control)] bg-paper px-3 py-2.5">
                  <span className="num w-16 shrink-0 text-xs text-muted">{s.start_time ? formatTime(s.start_time) : 'Any time'}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`text-sm font-semibold ${s.done_at ? 'text-muted line-through' : ''}`}>{s.title}</span>
                    <span className="block text-xs text-muted">
                      {s.kind === 'exam' ? 'Exam' : 'Reading'}{s.duration_min ? ` · ${s.duration_min} min` : ''}{s.done_at ? ' · done' : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/plan#add" className="btn btn-soft mt-4 w-full">Add a study session <span aria-hidden="true">→</span></Link>
          )}
        </section>
      </div>

      <aside className="grid content-start gap-4 md:pt-[7.5rem]" aria-label="Coming up">
        <section aria-labelledby="next-deadline">
          {nextAssignment ? (
            <Link href={`/assignments/${nextAssignment.id}`} className="panel flex items-center gap-4 p-4 hover:bg-paper">
              <span className="icon-tile bg-rose-wash text-rose-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span id="next-deadline" className="block text-xs font-semibold text-muted">Next assignment</span>
                <span className="block truncate text-sm font-semibold">{nextAssignment.title}</span>
              </span>
              <span className="text-right text-xs text-muted">
                Due<span className="block font-semibold text-ink">{formatDateTime(nextAssignment.due_at, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="sr-only"> ({relativeDue(nextAssignment.due_at)})</span>
              </span>
            </Link>
          ) : (
            <div className="panel p-4">
              <h2 id="next-deadline" className="text-xs font-semibold text-muted">Next assignment</h2>
              <p className="mt-1 text-sm">Nothing due for {levelLabel(profile.level)} right now.</p>
            </div>
          )}
        </section>
        <section aria-labelledby="latest-update">
          {latest ? (
            <Link href={`/updates/${latest.id}`} className="card-lavender block p-4 hover:brightness-[0.98]">
              <span id="latest-update" className="block text-xs font-semibold text-lavender-ink">Latest from the committee</span>
              <span className="mt-1 block font-semibold">{latest.title}</span>
              <span className="mt-1 block text-xs text-muted">{formatDateTime(latest.published_at, { day: 'numeric', month: 'short' })}</span>
            </Link>
          ) : (
            <div className="card-lavender p-4">
              <h2 id="latest-update" className="text-xs font-semibold text-lavender-ink">Latest from the committee</h2>
              <p className="mt-1 text-sm">No updates yet.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
