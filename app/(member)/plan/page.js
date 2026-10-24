import Link from 'next/link';
import { RefreshingForm } from '@/components/RefreshingForm';
import { requireMember } from '@/lib/auth';
import { lagosToday, addDays, weekDays, formatDay, formatTime, formatDateTime, parseDay, toDay, relativeDue } from '@/lib/dates';
import { GoalForm, AddSessionForm } from './forms';
import { moveSession, deleteSession } from './actions';
import { DoneToggle } from './DoneToggle';
import { AddToCalendar } from '@/components/AddToCalendar';

export const metadata = { title: 'Plan' };

export default async function PlanPage({ searchParams }) {
  const { view, month } = await searchParams;
  const { supabase } = await requireMember();
  const today = lagosToday();
  const isMonth = view === 'month';
  const monthStart = isMonth && /^\d{4}-\d{2}$/.test(month || '') ? `${month}-01` : `${today.slice(0, 7)}-01`;
  const rangeFrom = isMonth ? monthStart : addDays(today, -14);
  const rangeTo = isMonth ? addDays(toDay(new Date(Date.UTC(+monthStart.slice(0, 4), +monthStart.slice(5, 7), 1, 12))), -1) : addDays(today, 60);

  const [goalRes, historyRes, sessionsRes, assignmentsRes] = await Promise.all([
    supabase.from('goals').select('id, title, days_per_week, minutes_per_day, created_at').eq('active', true).maybeSingle(),
    supabase.from('goals').select('id, title, days_per_week, created_at, archived_at').eq('active', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('study_sessions').select('id, kind, title, starts_on, start_time, duration_min, done_at')
      .gte('starts_on', rangeFrom).lte('starts_on', rangeTo).order('starts_on').order('start_time', { nullsFirst: true }).limit(300),
    supabase.from('assignments').select('id, title, due_at')
      .eq('status', 'published').gte('due_at', new Date(`${rangeFrom}T00:00:00+01:00`).toISOString())
      .lte('due_at', new Date(`${rangeTo}T23:59:59+01:00`).toISOString()).order('due_at').limit(100),
  ]);

  const goal = goalRes.data;
  const sessions = sessionsRes.data || [];
  const assignments = (assignmentsRes.data || []).map((a) => ({ ...a, day: lagosDay(a.due_at) }));
  const error = sessionsRes.error || assignmentsRes.error;

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid content-start gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="display text-[2.25rem] leading-[1.08]">Plan</h1>
          <nav aria-label="Plan view" className="flex rounded-md bg-stone/60 p-1 text-sm">
            <Link href="/plan" aria-current={!isMonth ? 'page' : undefined} className={`rounded px-3 py-1.5 ${!isMonth ? 'bg-surface font-bold' : 'text-muted'}`}>Agenda</Link>
            <Link href="/plan?view=month" aria-current={isMonth ? 'page' : undefined} className={`rounded px-3 py-1.5 ${isMonth ? 'bg-surface font-bold' : 'text-muted'}`}>Month</Link>
          </nav>
        </div>

        {error ? (
          <div role="alert" className="panel grid gap-2 p-5">
            <p className="font-semibold">Couldn't load your plan.</p>
            <Link href="/plan" className="btn btn-outline justify-self-start">Retry</Link>
          </div>
        ) : isMonth ? (
          <MonthView monthStart={monthStart} today={today} sessions={sessions} assignments={assignments} />
        ) : (
          <Agenda today={today} sessions={sessions} assignments={assignments} />
        )}
      </div>

      <aside className="grid content-start gap-10">
        <section id="goal" aria-labelledby="goal-heading" className="panel scroll-mt-6 p-5">
          <h2 id="goal-heading" className="text-base font-bold">Reading goal</h2>
          {goal && (
            <p className="mt-2 text-base">
              <strong>{goal.title}</strong>
              <span className="block text-sm text-muted">
                {goal.days_per_week} {goal.days_per_week === 1 ? 'day' : 'days'} a week{goal.minutes_per_day ? ` · ${goal.minutes_per_day} min a day` : ''} · since {formatDateTime(goal.created_at, { day: 'numeric', month: 'short' })}
              </span>
            </p>
          )}
          <div className="mt-4"><GoalForm goal={goal} /></div>
          {historyRes.data?.length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-medium">Earlier goals ({historyRes.data.length})</summary>
              <ul className="mt-2 grid gap-1 text-muted">
                {historyRes.data.map((g) => (
                  <li key={g.id}>{g.title} · {g.days_per_week}/week · until {formatDateTime(g.archived_at, { day: 'numeric', month: 'short' })}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
        <section id="add" aria-labelledby="add-heading" className="panel scroll-mt-6 p-5">
          <h2 id="add-heading" className="text-base font-bold">Add to your plan</h2>
          <div className="mt-4"><AddSessionForm today={today} /></div>
        </section>
      </aside>
    </div>
  );
}

function lagosDay(iso) {
  return lagosToday(new Date(iso));
}

function Agenda({ today, sessions, assignments }) {
  const week = weekDays(today);
  const endOfWeek = week[6];
  const items = [
    ...sessions.map((s) => ({ type: 'session', day: s.starts_on, sort: `${s.starts_on} ${s.start_time || '00:00'}`, ...s })),
    ...assignments.map((a) => ({ type: 'assignment', sort: `${a.day} ${formatDateTime(a.due_at, { hour: '2-digit', minute: '2-digit', hour12: false })}`, ...a })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  const missed = items.filter((i) => i.type === 'session' && i.kind === 'reading' && i.day < today && !i.done_at);
  const doneRecently = items.filter((i) => i.type === 'session' && i.day < today && i.done_at);
  const groups = [
    ['Today', items.filter((i) => i.day === today)],
    ['Rest of this week', items.filter((i) => i.day > today && i.day <= endOfWeek)],
    ['Later', items.filter((i) => i.day > endOfWeek)],
  ];

  return (
    <div className="grid gap-8">
      {missed.length > 0 && (
        <AgendaGroup title="Missed" note="Move a session to a new day, or remove it. It's fine; plans change." items={missed} today={today} />
      )}
      {groups.map(([title, list]) => (
        <AgendaGroup key={title} title={title} items={list} today={today}
          empty={title === 'Today' ? 'Nothing planned for today.' : title === 'Later' ? 'Nothing planned further ahead yet.' : 'Nothing else this week.'} />
      ))}
      {doneRecently.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Completed in the last two weeks ({doneRecently.length})</summary>
          <AgendaList items={doneRecently} today={today} />
        </details>
      )}
    </div>
  );
}

function AgendaGroup({ title, note, items, empty, today }) {
  return (
    <section aria-label={title} className="panel p-4">
      <h2 className="text-base font-bold">{title} <span className="num font-medium text-muted">{items.length || ''}</span></h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      {items.length ? <AgendaList items={items} today={today} /> : <p className="mt-2 text-sm text-muted">{empty}</p>}
    </section>
  );
}

function AgendaList({ items, today }) {
  return (
    <ul className="mt-2 divide-y divide-rule">
      {items.map((item) => item.type === 'assignment' ? (
        <li key={`a-${item.id}`} className="flex gap-4 py-3">
          <When day={item.day} today={today} time={formatDateTime(item.due_at, { hour: 'numeric', minute: '2-digit' })} />
          <div className="min-w-0 flex-1">
            <Link href={`/assignments/${item.id}`} className="font-semibold hover:underline">{item.title}</Link>
            <p className="text-sm text-rose-ink">Committee deadline · due {relativeDue(item.due_at)}</p>
          </div>
        </li>
      ) : (
        <SessionRow key={item.id} s={item} today={today} />
      ))}
    </ul>
  );
}

function When({ day, today, time }) {
  return (
    <div className="num w-20 shrink-0 text-sm">
      <span className="block font-semibold">{day === today ? 'Today' : formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      <span className="block text-muted">{time || 'Any time'}</span>
    </div>
  );
}

function SessionRow({ s, today }) {
  const state = s.done_at ? 'Done' : s.day < today && s.kind === 'reading' ? 'Missed' : s.kind === 'exam' ? 'Exam' : 'Planned';
  return (
    <li className="flex gap-4 py-3">
      <When day={s.starts_on} today={today} time={s.start_time ? formatTime(s.start_time) : ''} />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${s.done_at ? 'text-muted line-through' : ''}`}>{s.title}</p>
        <p className="text-sm text-muted">
          <span className={state === 'Missed' ? 'font-semibold text-danger' : state === 'Exam' ? 'font-semibold text-rose-ink' : ''}>{state}</span>
          {s.duration_min ? ` · ${s.duration_min} min` : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          {s.kind === 'reading' && <DoneToggle id={s.id} done={!!s.done_at} />}
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold underline underline-offset-4">Move</summary>
            <RefreshingForm action={moveSession} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={s.id} />
              <label className="field text-sm"><span className="label">New date</span><input type="date" name="starts_on" defaultValue={s.starts_on < today ? today : s.starts_on} min={today} className="input" required /></label>
              <label className="field text-sm"><span className="label">Time</span><input type="time" name="start_time" defaultValue={s.start_time?.slice(0, 5) || ''} className="input" /></label>
              <button className="btn btn-primary">Move</button>
            </RefreshingForm>
          </details>
          {!s.done_at && s.starts_on >= today && (
            <AddToCalendar
              compact
              uid={s.id}
              event={{ title: s.kind === 'exam' ? `Exam: ${s.title}` : `Study: ${s.title}`, day: s.starts_on, time: s.start_time, minutes: s.duration_min || (s.kind === 'exam' ? 120 : 60), details: 'Planned in TLV Academic' }}
            />
          )}
          <RefreshingForm action={deleteSession}>
            <input type="hidden" name="id" value={s.id} />
            <button className="min-h-11 text-sm font-medium text-muted underline underline-offset-4" aria-label={`Remove ${s.title}`}>Remove</button>
          </RefreshingForm>
        </div>
      </div>
    </li>
  );
}

function MonthView({ monthStart, today, sessions, assignments }) {
  const first = parseDay(monthStart);
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const n = i - lead + 1;
    return n >= 1 && n <= daysInMonth ? addDays(monthStart, n - 1) : null;
  });
  const prev = toDay(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 1, 1, 12))).slice(0, 7);
  const next = toDay(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1, 12))).slice(0, 7);
  const byDay = (d) => ({
    s: sessions.filter((x) => x.starts_on === d),
    a: assignments.filter((x) => x.day === d),
  });

  return (
    <section aria-label={formatDay(monthStart, { month: 'long', year: 'numeric' })}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{formatDay(monthStart, { month: 'long', year: 'numeric' })}</h2>
        <div className="flex gap-1">
          <Link href={`/plan?view=month&month=${prev}`} className="btn btn-outline min-h-10 px-3" aria-label="Previous month">←</Link>
          <Link href={`/plan?view=month&month=${next}`} className="btn btn-outline min-h-10 px-3" aria-label="Next month">→</Link>
        </div>
      </div>
      <table className="mt-4 w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <th key={d} scope="col" className="pb-2 text-xs font-semibold text-muted">{d}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, r) => (
            <tr key={r}>
              {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                if (!d) return <td key={i} className="border border-rule bg-paper" />;
                const { s, a } = byDay(d);
                const exams = s.filter((x) => x.kind === 'exam').length;
                const reading = s.length - exams;
                const label = [reading && `${reading} reading`, exams && `${exams} exam`, a.length && `${a.length} deadline`].filter(Boolean).join(', ');
                return (
                  <td key={i} className={`h-16 border border-rule p-1 align-top ${d === today ? 'bg-surface outline-2 -outline-offset-2 outline-ink' : 'bg-surface/60'}`}>
                    <span className={`num block text-xs ${d === today ? 'font-bold' : 'text-muted'}`}>{Number(d.slice(8))}</span>
                    <span className="sr-only">{label || 'Nothing planned'}</span>
                    <span aria-hidden="true" className="mt-1 flex flex-wrap gap-0.5">
                      {Array.from({ length: Math.min(reading, 3) }, (_, k) => <span key={`r${k}`} className="size-2 rounded-full bg-sage" />)}
                      {Array.from({ length: Math.min(exams, 2) }, (_, k) => <span key={`e${k}`} className="size-2 rotate-45 bg-ink" />)}
                      {Array.from({ length: Math.min(a.length, 2) }, (_, k) => <span key={`a${k}`} className="h-2 w-3 bg-rose" />)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted" aria-label="Key">
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sage" aria-hidden="true" />Reading session</li>
        <li className="flex items-center gap-1.5"><span className="size-2 rotate-45 bg-ink" aria-hidden="true" />Exam</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-3 bg-rose" aria-hidden="true" />Committee deadline</li>
      </ul>
    </section>
  );
}
