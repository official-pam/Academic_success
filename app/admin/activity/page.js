import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { levelLabel } from '@/lib/constants';
import { formatDateTime } from '@/lib/dates';

export const metadata = { title: 'Activity' };

/**
  Notifications for mentors (point 10): every finished focus session and every new result from the students
  in this viewer's scope, newest first. Opening the page marks everything as seen.
*/
export default async function ActivityPage({ searchParams }) {
  const { before } = await searchParams;
  const { supabase, profile } = await requireStaff();
  const cursor = before && !Number.isNaN(Date.parse(before)) ? before : null;
  const { data, error } = await supabase.rpc('mentor_feed', { p_before: cursor, p_limit: 31 });
  const items = (data || []).slice(0, 30);
  const more = (data || []).length > 30;
  const seenBefore = profile.feed_seen_at ? new Date(profile.feed_seen_at) : null;
  if (!cursor) await supabase.rpc('mark_feed_seen');

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="display text-[2.25rem] leading-[1.08]">Activity</h1>
        <p className="mt-1 text-sm text-muted">Finished focus sessions and new results from the students you look after, newest first.</p>
      </div>
      {error ? (
        <p role="alert" className="notice">Couldn't load activity. Try again.</p>
      ) : items.length === 0 ? (
        <p className="rounded-[var(--radius-control)] border border-dashed border-stone px-4 py-3 text-sm text-muted">
          Nothing yet. When a student finishes a focus session or records a result, it shows up here.
        </p>
      ) : (
        <ul className="panel divide-y divide-rule overflow-hidden">
          {items.map((it, i) => {
            const isNew = !cursor && (!seenBefore || new Date(it.at) > seenBefore);
            return (
              <li key={`${it.kind}-${it.at}-${i}`} className={`flex gap-4 px-4 py-3 ${isNew ? 'bg-lavender-wash/60' : ''}`}>
                <span className={`icon-tile ${it.kind === 'result' ? 'bg-sage-wash text-sage-ink' : 'bg-lavender-wash text-lavender-ink'}`} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    {it.kind === 'result'
                      ? <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9.5 14l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
                      : <><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.5M9.5 3h5" strokeLinecap="round" strokeLinejoin="round" /></>}
                  </svg>
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <Link href={`/admin/students/${it.member_id}`} className="font-semibold underline-offset-4 hover:underline">{it.member_name}</Link>{' '}
                    {it.kind === 'result' ? 'recorded a result for' : 'finished a focus session on'} <strong>{it.title}</strong>
                  </p>
                  <p className="text-muted">
                    {it.detail} · {[it.school_code, levelLabel(it.level)].filter(Boolean).join(' · ')} · {formatDateTime(it.at)}
                    {isNew && <span className="ml-2 chip bg-lavender-strong text-white">New</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {more && <Link href={`/admin/activity?before=${encodeURIComponent(items[items.length - 1].at)}`} className="btn btn-outline justify-self-start">Older activity</Link>}
      {cursor && <Link href="/admin/activity" className="text-sm underline underline-offset-4">Back to latest</Link>}
    </div>
  );
}
