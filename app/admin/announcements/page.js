import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';
import { StatusTabs, statusCounts, parseStatus } from '@/components/admin/StatusTabs';
import { StatusChip } from '@/components/admin/StatusChip';

export const metadata = { title: 'Announcements' };

export default async function AdminAnnouncements({ searchParams }) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const { supabase } = await requireStaff();
  const [list, counts] = await Promise.all([
    supabase.from('announcements').select('id, title, level, pinned, status, published_at, updated_at').eq('status', status).order('updated_at', { ascending: false }).limit(50),
    statusCounts(supabase, 'announcements'),
  ]);
  const rows = list.data || [];
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <Link href="/admin/announcements/new" className="btn btn-primary">New announcement</Link>
      </div>
      {sp.saved && <p role="status" className="rounded-md bg-sage-wash px-3 py-2 text-sm text-sage-ink">Saved.</p>}
      <StatusTabs base="/admin/announcements" current={status} counts={counts} />
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone px-4 py-3 text-sm text-muted">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-rule border-b border-rule">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/announcements/${a.id}`} className="grid gap-1 py-3 hover:bg-surface sm:grid-cols-[minmax(0,1fr)_8rem_7rem_6rem] sm:items-center sm:gap-4 sm:px-2">
                <span className="font-semibold">{a.pinned && <span className="text-clay-ink">Pinned · </span>}{a.title}</span>
                <span className="text-sm text-muted">{levelLabel(a.level)}</span>
                <span className="num text-sm">{formatDateTime(a.published_at || a.updated_at, { day: 'numeric', month: 'short' })}</span>
                <span><StatusChip status={a.status} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
