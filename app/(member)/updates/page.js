import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { formatDateTime, relativeDue } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';

export const metadata = { title: 'Updates' };
const PAGE = 15;

export default async function UpdatesPage({ searchParams }) {
  const { before } = await searchParams;
  const { supabase, profile } = await requireMember();
  let q = supabase.from('announcements').select('id, title, body, level, pinned, published_at')
    .eq('status', 'published').order('published_at', { ascending: false }).limit(PAGE + 1);
  if (before && !Number.isNaN(Date.parse(before))) q = q.lt('published_at', before);

  const [annRes, dueRes] = await Promise.all([
    q,
    before ? Promise.resolve({ data: [] }) : supabase.from('assignments').select('id, title, due_at, level, department')
      .eq('status', 'published').gte('due_at', new Date().toISOString()).order('due_at').limit(6),
  ]);
  const rows = annRes.data || [];
  const hasMore = rows.length > PAGE;
  const list = rows.slice(0, PAGE);
  const pinned = before ? [] : list.filter((a) => a.pinned);
  const rest = before ? list : list.filter((a) => !a.pinned);

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_17rem]">
      <section aria-labelledby="updates-heading" className="grid content-start gap-4">
        <h1 id="updates-heading" className="text-2xl font-bold tracking-tight">Updates</h1>
        {annRes.error ? (
          <div role="alert" className="panel grid gap-2 p-5"><p>Couldn't load updates.</p><Link href="/updates" className="btn btn-outline justify-self-start">Retry</Link></div>
        ) : list.length === 0 ? (
          <p className="border-y border-rule py-4 text-muted">No announcements yet. When the committee posts one, it appears here.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {[...pinned, ...rest].map((a) => (
              <li key={a.id}>
                <Link href={`/updates/${a.id}`} className="block py-4 hover:bg-surface">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{a.title}</span>
                    <span className="num shrink-0 text-xs text-muted">{formatDateTime(a.published_at, { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted">{a.body}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {a.pinned && !before ? <span className="font-semibold text-clay-ink">Pinned · </span> : null}{levelLabel(a.level)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <Link href={`/updates?before=${encodeURIComponent(list[list.length - 1].published_at)}`} className="btn btn-outline justify-self-start">Older updates</Link>
        )}
        {before && <Link href="/updates" className="text-sm underline underline-offset-4">Back to latest</Link>}
      </section>

      {!before && (
        <aside aria-labelledby="due-heading">
          <h2 id="due-heading" className="text-base font-bold">Assignments for {levelLabel(profile.level)}</h2>
          {dueRes.data?.length ? (
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {dueRes.data.map((a) => (
                <li key={a.id}>
                  <Link href={`/assignments/${a.id}`} className="block py-3 hover:underline">
                    <span className="block font-semibold">{a.title}</span>
                    <span className="block text-sm text-muted">Due {relativeDue(a.due_at)}{a.department ? ` · ${a.department}` : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Nothing due right now.</p>
          )}
        </aside>
      )}
    </div>
  );
}
