import Link from 'next/link';
import { requireMember, isStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { RefreshingForm } from '@/components/RefreshingForm';
import { MemberPointForm, PrayerRequestForm } from './PrayerForms';
import { deleteMemberPoint, moderateMemberPoint, deletePrayerRequest } from './actions';
import { lagosToday, weekStart, formatDay } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';

export const metadata = { title: 'Support' };

// Spiritual support and help, kept apart from any reading statistics (spec screen 3).
export default async function SupportPage() {
  const { supabase, user, profile } = await requireMember();
  const staff = isStaff(profile);
  const thisWeek = weekStart(lagosToday());
  const [prayerRes, contactsRes, memberRes, requestsRes] = await Promise.all([
    supabase.from('prayer_points').select('id, week_of, points, scripture').eq('status', 'published').lte('week_of', thisWeek).order('week_of', { ascending: false }).limit(5),
    supabase.rpc('my_support_contacts'),
    supabase.from('member_prayer_points').select('id, user_id, author_name, body, hidden, created_at').order('created_at', { ascending: false }).limit(30),
    supabase.rpc('my_prayer_requests'),
  ]);
  const memberPoints = memberRes.data || [];
  const myRequests = requestsRes.data || [];
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
          <p className="mt-2"><span className="chip bg-lavender-wash text-lavender-ink">From the committee</span></p>
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

        <section aria-labelledby="member-points-heading" className="mt-6 grid gap-4">
          <div>
            <h2 id="member-points-heading" className="text-lg font-bold">From members</h2>
            <p className="text-sm text-muted">Prayer points shared by members. The committee's points above come first.</p>
          </div>
          <div className="panel p-4"><MemberPointForm /></div>
          {memberRes.error ? (
            <p role="alert" className="notice">Couldn't load members' prayer points.</p>
          ) : memberPoints.length ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {memberPoints.map((m) => (
                <li key={m.id} className={`grid gap-1 py-3 ${m.hidden ? 'opacity-60' : ''}`}>
                  <p className="text-base leading-relaxed">{m.body}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{m.author_name} · {formatDateTime(m.created_at, { day: 'numeric', month: 'short' })}</span>
                    {m.hidden && <span className="chip bg-rose-wash text-rose-ink">Hidden from members</span>}
                    {m.user_id === user.id && (
                      <RefreshingForm action={deleteMemberPoint}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="min-h-9 font-semibold underline-offset-4 hover:underline">Delete</button>
                      </RefreshingForm>
                    )}
                    {staff && m.user_id !== user.id && (
                      <RefreshingForm action={moderateMemberPoint}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="hidden" value={m.hidden ? '0' : '1'} />
                        <button className="min-h-9 font-semibold text-rose-ink underline-offset-4 hover:underline">{m.hidden ? 'Show again' : 'Hide'}</button>
                      </RefreshingForm>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-control)] border border-dashed border-stone px-4 py-3 text-sm text-muted">No member prayer points yet. Be the first to share one.</p>
          )}
        </section>

        <section id="request" aria-labelledby="request-heading" className="mt-6 grid scroll-mt-6 gap-4">
          <div>
            <h2 id="request-heading" className="text-lg font-bold">Prayer request to the committee</h2>
            <p className="text-sm text-muted">For something personal. Only your committee head and the admin see it.</p>
          </div>
          <div className="card-lavender p-4"><PrayerRequestForm headName={coordinators[0]?.full_name} /></div>
          {myRequests.length > 0 && (
            <ul className="grid gap-2">
              {myRequests.map((r) => (
                <li key={r.id} className="panel grid gap-1 p-4">
                  <p className="text-sm">{r.body}</p>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span>Sent {formatDateTime(r.created_at, { day: 'numeric', month: 'short' })}</span>
                    {r.prayed_at
                      ? <span className="chip bg-sage-wash text-sage-ink">Prayed for{r.prayed_by_name ? ` by ${r.prayed_by_name.split(' ')[0]}` : ''}</span>
                      : <span className="chip bg-paper text-muted">Waiting</span>}
                    <RefreshingForm action={deletePrayerRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="min-h-9 font-semibold underline-offset-4 hover:underline">Delete</button>
                    </RefreshingForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {staff && <Link href="/admin/prayer-requests" className="text-sm font-semibold text-lavender-ink underline-offset-4 hover:underline">See requests from your students →</Link>}
        </section>
      </section>

      <aside className="grid content-start gap-8">
        <section aria-labelledby="help-heading" className="panel p-5">
          <h2 id="help-heading" className="text-base font-bold">Need help with your studies?</h2>
          <p className="mt-2 text-sm">
            Talk to your committee head (your mentor). They can connect you with someone in a related department, a study
            group or past questions. What you share stays private.
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted">Your committee head{profile.school_code ? ` (${profile.school_code})` : ''}</dt>
              <dd className="font-semibold">{coordinators.length ? coordinators.map((c) => c.full_name).join(', ') : (profile.school_code ? 'Not assigned yet' : 'Set your school in Profile')}</dd>
            </div>
            {chair && (
              <div>
                <dt className="text-muted">Admin, Academic Committee</dt>
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
