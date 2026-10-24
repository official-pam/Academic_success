import { requireMember } from '@/lib/auth';
import { lagosToday, weekStart, formatDay } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';

export const metadata = { title: 'Support' };

// Spiritual support and help, kept apart from any reading statistics (spec screen 3).
export default async function SupportPage() {
  const { supabase, profile } = await requireMember();
  const thisWeek = weekStart(lagosToday());
  const [prayerRes, contactsRes] = await Promise.all([
    supabase.from('prayer_points').select('id, week_of, points, scripture').eq('status', 'published').lte('week_of', thisWeek).order('week_of', { ascending: false }).limit(5),
    supabase.rpc('my_support_contacts'),
  ]);
  const weeks = prayerRes.data || [];
  const current = weeks[0];
  const earlier = weeks.slice(1);
  const contacts = contactsRes.data || [];
  const coordinators = contacts.filter((c) => c.role === 'coordinator');
  const chair = contacts.find((c) => c.role === 'chairman');

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_17rem]">
      <section aria-labelledby="prayer-heading" className="grid content-start gap-5">
        <div>
          <h1 id="prayer-heading" className="display text-[2.25rem] leading-[1.08]">Prayer points</h1>
          {current && (
            <p className="mt-1 text-sm text-muted">
              {current.week_of === thisWeek ? 'This week' : 'Most recent'} · week of {formatDay(current.week_of, { day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
        {prayerRes.error ? (
          <p role="alert" className="panel p-5">Couldn't load prayer points. Pull to refresh or try again shortly.</p>
        ) : current ? (
          <>
            <ol className="grid gap-0 divide-y divide-rule border-y border-rule">
              {current.points.map((p, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] py-4 text-lg leading-relaxed">
                  <span className="num text-base font-semibold text-lavender-ink">{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
            {current.scripture && <p className="text-base italic text-sage-ink">{current.scripture}</p>}
          </>
        ) : (
          <p className="border-y border-rule py-4 text-base text-muted">This week's prayer points haven't been shared yet. Check back soon.</p>
        )}
        {earlier.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold">Earlier weeks</summary>
            <div className="mt-3 grid gap-5">
              {earlier.map((w) => (
                <section key={w.id} aria-label={`Week of ${formatDay(w.week_of, { day: 'numeric', month: 'long' })}`}>
                  <h3 className="text-sm font-bold">Week of {formatDay(w.week_of, { day: 'numeric', month: 'long' })}</h3>
                  <ol className="mt-1 list-decimal pl-5 text-base">{w.points.map((p, i) => <li key={i}>{p}</li>)}</ol>
                </section>
              ))}
            </div>
          </details>
        )}
      </section>

      <aside className="grid content-start gap-8">
        <section aria-labelledby="help-heading" className="panel p-5">
          <h2 id="help-heading" className="text-base font-bold">Need help with your studies?</h2>
          <p className="mt-2 text-sm">
            Talk to your level coordinator. They can connect you with a mentor in a related department, a study
            group or past questions. What you share stays private.
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted">{levelLabel(profile.level)} coordinator</dt>
              <dd className="font-semibold">{coordinators.length ? coordinators.map((c) => c.full_name).join(', ') : 'Not assigned yet'}</dd>
            </div>
            {chair && (
              <div>
                <dt className="text-muted">Chairman, Academic Committee</dt>
                <dd className="font-semibold">{chair.full_name}</dd>
              </div>
            )}
          </dl>
        </section>
        <section aria-labelledby="ways-heading">
          <h2 id="ways-heading" className="text-base font-bold">Ways the committee helps</h2>
          <ul className="mt-3 grid gap-3 text-sm">
            <li><strong className="block">Mentorship</strong>Paired with a senior member in the same or a related department.</li>
            <li><strong className="block">Study groups</strong>Weekly, by level. Times are posted in Updates.</li>
            <li><strong className="block">Seminars and tutorials</strong>Announced in Updates before each one.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
