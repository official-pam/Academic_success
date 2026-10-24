import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { levelLabel } from '@/lib/constants';
import { formatDateTime } from '@/lib/dates';
import { RefreshingForm } from '@/components/RefreshingForm';
import { markPrayed } from './actions';

export const metadata = { title: 'Prayer requests' };

/** Private prayer requests from the members this committee member looks after (RLS decides who). */
export default async function PrayerRequestsPage({ searchParams }) {
  const { show } = await searchParams;
  const { supabase, user } = await requireStaff();
  const answered = show === 'prayed';
  let q = supabase.from('prayer_requests').select('id, user_id, body, created_at, prayed_at').neq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(60);
  q = answered ? q.not('prayed_at', 'is', null) : q.is('prayed_at', null);
  const { data: requests, error } = await q;
  const ids = [...new Set((requests || []).map((r) => r.user_id))];
  const { data: people } = ids.length
    ? await supabase.from('profiles').select('id, full_name, level, school_code').in('id', ids)
    : { data: [] };
  const who = Object.fromEntries((people || []).map((p) => [p.id, p]));

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="display text-[2.25rem] leading-[1.08]">Prayer requests</h1>
        <p className="mt-1 text-sm text-muted">Private requests from the members you look after. Pray, then mark each one so they know.</p>
      </div>
      <nav aria-label="Filter" className="flex gap-1 border-b border-rule">
        {[['', 'Waiting'], ['prayed', 'Prayed for']].map(([k, label]) => (
          <Link key={k} href={k ? `/admin/prayer-requests?show=${k}` : '/admin/prayer-requests'} aria-current={(k === 'prayed') === answered ? 'page' : undefined}
            className={`-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm ${(k === 'prayed') === answered ? 'border-ink font-bold' : 'border-transparent text-muted'}`}>
            {label}
          </Link>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="notice">Couldn't load prayer requests. Try again.</p>
      ) : !requests?.length ? (
        <p className="rounded-[var(--radius-control)] border border-dashed border-stone px-4 py-3 text-sm text-muted">
          {answered ? 'Nothing marked as prayed for yet.' : 'No waiting requests. When a member sends one, it appears here.'}
        </p>
      ) : (
        <ul className="grid gap-3">
          {requests.map((r) => {
            const p = who[r.user_id];
            return (
              <li key={r.id} className="panel grid gap-2 p-4">
                <p className="text-base leading-relaxed">{r.body}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted">
                    <Link href={`/admin/students/${r.user_id}`} className="font-semibold text-ink underline-offset-4 hover:underline">{p?.full_name || 'A member'}</Link>
                    {p ? ` · ${[p.school_code, levelLabel(p.level)].filter(Boolean).join(' · ')}` : ''} · {formatDateTime(r.created_at)}
                  </span>
                  <RefreshingForm action={markPrayed}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="prayed" value={r.prayed_at ? '0' : '1'} />
                    <button className={r.prayed_at ? 'btn btn-ghost min-h-10 px-4' : 'btn btn-primary min-h-10 px-4'}>
                      {r.prayed_at ? 'Mark as waiting' : 'Mark as prayed for'}
                    </button>
                  </RefreshingForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
