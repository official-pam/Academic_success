import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { formatDay } from '@/lib/dates';
import { StatusTabs, statusCounts, parseStatus } from '@/components/admin/StatusTabs';
import { StatusChip } from '@/components/admin/StatusChip';

export const metadata = { title: 'Prayer points' };

export default async function AdminPrayer({ searchParams }) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const { supabase } = await requireStaff();
  const [list, counts] = await Promise.all([
    supabase.from('prayer_points').select('id, week_of, points, status').eq('status', status).order('week_of', { ascending: false }).limit(30),
    statusCounts(supabase, 'prayer_points'),
  ]);
  const rows = list.data || [];
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-[2.25rem] leading-[1.08]">Prayer points</h1>
        <Link href="/admin/prayer-points/new" className="btn btn-primary">New week</Link>
      </div>
      {sp.saved && <p role="status" className="rounded-md bg-sage-wash px-3 py-2 text-sm text-sage-ink">Saved.</p>}
      <StatusTabs base="/admin/prayer-points" current={status} counts={counts} />
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone px-4 py-3 text-sm text-muted">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-rule border-b border-rule">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/prayer-points/${p.id}`} className="grid gap-1 py-3 hover:bg-surface sm:grid-cols-[10rem_minmax(0,1fr)_6rem] sm:items-center sm:gap-4 sm:px-2">
                <span className="font-semibold">Week of {formatDay(p.week_of, { day: 'numeric', month: 'short' })}</span>
                <span className="truncate text-sm text-muted">{p.points.length} points · {p.points[0]}</span>
                <span><StatusChip status={p.status} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
