import Link from 'next/link';
import { isDay } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { lagosToday, weekStart, addDays, formatDay } from '@/lib/dates';
import { levelLabel, MIN_GROUP } from '@/lib/constants';

export const metadata = { title: 'Participation' };

const pct = (a, b) => (b >= MIN_GROUP ? Math.round((a / b) * 100) : null);

export default async function ParticipationPage({ searchParams }) {
  const { week } = await searchParams;
  const { supabase, profile } = await requireStaff();
  const thisWeek = weekStart(lagosToday());
  const ws = isDay(week) && week <= thisWeek ? weekStart(week) : thisWeek;
  const we = addDays(ws, 6);

  const [byLevel, weekly] = await Promise.all([
    supabase.rpc('participation_by_level', { p_from: ws, p_to: we }),
    supabase.rpc('participation_weekly', { p_weeks: 8 }),
  ]);
  const rows = (byLevel.data || []).map((r) => ({ ...r, members: Number(r.members), active: Number(r.active_members), checkins: Number(r.checkins) }));
  const visibleRows = rows.filter((r) => r.members >= MIN_GROUP);
  const totals = visibleRows.reduce((t, r) => ({ members: t.members + r.members, active: t.active + r.active, checkins: t.checkins + r.checkins }), { members: 0, active: 0, checkins: 0 });
  const hasHiddenGroups = rows.some((r) => r.members > 0 && r.members < MIN_GROUP);
  const withMembers = rows.filter((r) => r.members >= MIN_GROUP);
  const lowest = withMembers.length > 1 ? [...withMembers].sort((a, b) => a.active / a.members - b.active / b.members)[0] : null;
  const isCurrent = ws === thisWeek;
  const weeks = [...new Set((weekly.data || []).map((r) => r.week_start))].sort();
  const cell = (w, l) => (weekly.data || []).find((r) => r.week_start === w && r.level === l);
  const levels = rows.map((r) => r.level);

  let finding;
  if (!totals.members && hasHiddenGroups) finding = 'Reading totals are hidden until a level has at least three members.';
  else if (!totals.members) finding = 'No members have finished setting up yet. Share the app link with your level.';
  else if (lowest && pct(lowest.active, lowest.members) < pct(totals.active, totals.members))
    finding = `${levelLabel(lowest.level)} is lowest ${isCurrent ? 'so far this week' : 'that week'}: ${pct(lowest.active, lowest.members)}% of its ${lowest.members} members read at least once. Consider a supportive check-in with its coordinator.`;
  else if (totals.members < MIN_GROUP) finding = `${totals.members} ${totals.members === 1 ? 'member has' : 'members have'} joined. Reading shares appear once a group has ${MIN_GROUP} or more members.`;
  else finding = `${totals.active} of ${totals.members} members read at least once ${isCurrent ? 'so far this week' : 'that week'}.`;

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2.25rem] leading-[1.08]">Participation</h1>
          <p className="mt-1 text-sm text-muted">
            Week of {formatDay(ws, { day: 'numeric', month: 'long' })}{isCurrent ? ' (this week, so far)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin?week=${addDays(ws, -7)}`} className="btn btn-outline min-h-10 px-3" aria-label="Previous week">←</Link>
          <Link href={isCurrent ? '#' : `/admin?week=${addDays(ws, 7)}`} aria-disabled={isCurrent} className={`btn btn-outline min-h-10 px-3 ${isCurrent ? 'pointer-events-none opacity-40' : ''}`} aria-label="Next week">→</Link>
          <a href="/admin/export?weeks=16" className="btn btn-primary min-h-10" download>Export semester summary (CSV)</a>
        </div>
      </div>

      {byLevel.error ? (
        <div role="alert" className="panel grid gap-2 p-5"><p>Couldn't load participation.</p><Link href="/admin" className="btn btn-outline justify-self-start">Retry</Link></div>
      ) : (
        <>
          <p className="max-w-3xl text-lg font-semibold leading-snug">{finding}</p>

          <section aria-labelledby="by-level" className="panel overflow-x-auto p-1">
            <h2 id="by-level" className="sr-only">Participation by level</h2>
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Level</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Members</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Read at least once</th>
                  <th scope="col" className="w-[30%] px-4 py-3 font-semibold"><span className="sr-only">Share</span></th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Check-ins</th>
                </tr>
              </thead>
              <tbody className="num">
                {rows.map((r) => {
                  const p = pct(r.active, r.members);
                  return (
                    <tr key={r.level} className="border-t border-rule">
                      <th scope="row" className="px-4 py-3 text-left font-bold">{levelLabel(r.level)}</th>
                      <td className="px-4 py-3 text-right">{r.members}</td>
                      <td className="px-4 py-3 text-right">{p === null ? <span className="text-muted" title={`Hidden for groups under ${MIN_GROUP}`}>—</span> : <>{r.active} <span className="text-muted">({p}%)</span></>}</td>
                      <td className="px-4 py-3">
                        <div className="h-2.5 w-full rounded-sm bg-stone/60" aria-hidden="true">
                          <div className="h-full rounded-sm bg-sage" style={{ width: `${p ?? 0}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{p === null ? <span className="text-muted">—</span> : r.checkins}</td>
                    </tr>
                  );
                })}
                {rows.length > 1 && (
                  <tr className="border-t-2 border-stone font-bold">
                    <th scope="row" className="px-4 py-3 text-left">Levels included in totals</th>
                    <td className="px-4 py-3 text-right">{totals.members}</td>
                    <td className="px-4 py-3 text-right">{pct(totals.active, totals.members) === null ? '—' : <>{totals.active} <span className="font-normal text-muted">({pct(totals.active, totals.members)}%)</span></>}</td>
                    <td />
                    <td className="px-4 py-3 text-right">{totals.members < MIN_GROUP ? '—' : totals.checkins}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {weeks.length > 0 && (
            <section aria-labelledby="trend">
              <h2 id="trend" className="text-base font-bold">Last 8 weeks</h2>
              <p className="mt-1 text-sm text-muted">Share of members who read at least once each week. Darker means more.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="num w-full min-w-[36rem] border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr>
                      <th scope="col" className="text-left font-semibold text-muted">Week of</th>
                      {weeks.map((w) => <th key={w} scope="col" className="font-semibold text-muted">{formatDay(w, { day: 'numeric', month: 'short' })}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((l) => (
                      <tr key={l}>
                        <th scope="row" className="pr-2 text-left font-bold">{levelLabel(l)}</th>
                        {weeks.map((w) => {
                          const c = cell(w, l);
                          const m = Number(c?.members || 0), a = Number(c?.active_members || 0);
                          const p = pct(a, m);
                          return (
                            <td key={w} className="h-10 rounded text-center" style={{ background: p === null ? 'transparent' : `color-mix(in srgb, var(--color-lavender-strong) ${Math.round(10 + p * 0.8)}%, var(--color-surface))`, color: p !== null && p > 55 ? 'var(--color-surface)' : 'var(--color-ink)' }}>
                              {p === null ? <span className="text-muted">—</span> : `${p}%`}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="max-w-3xl text-sm text-muted">
            Totals include only levels with at least three members. Counts only. Individual check-ins and private notes are never shown to the committee, and reading shares are hidden (—) for any group under {MIN_GROUP} members so no one can be singled out. Low participation is a
            prompt for supportive follow-up through the committee head, not a judgement about anyone's effort.
          </p>
        </>
      )}
      {profile.role === 'coordinator' && <p className="sr-only">Showing your level only.</p>}
    </div>
  );
}
