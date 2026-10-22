import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { formatDateTime, relativeDue } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';
import { StatusTabs, statusCounts, parseStatus } from '@/components/admin/StatusTabs';
import { StatusChip } from '@/components/admin/StatusChip';

export const metadata = { title: 'Assignments' };
const PAGE = 25;

export default async function AdminAssignments({ searchParams }) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = Math.max(Number(sp.page) || 1, 1);
  const { supabase, profile } = await requireStaff();
  const [list, counts] = await Promise.all([
    supabase.from('assignments').select('id, title, due_at, level, department, status, updated_at')
      .eq('status', status).order(status === 'published' ? 'due_at' : 'updated_at', { ascending: status === 'published' })
      .range((page - 1) * PAGE, page * PAGE),
    statusCounts(supabase, 'assignments'),
  ]);
  const rows = (list.data || []).slice(0, PAGE);
  const hasMore = (list.data || []).length > PAGE;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted">{profile.role === 'coordinator' ? `Reading tasks for ${levelLabel(profile.coordinator_level)}` : 'Reading tasks for every level'}</p>
        </div>
        <Link href="/admin/assignments/new" className="btn btn-primary">New assignment</Link>
      </div>
      {sp.saved && <p role="status" className="rounded-md bg-sage-wash px-3 py-2 text-sm text-sage-ink">Saved.</p>}
      <StatusTabs base="/admin/assignments" current={status} counts={counts} />
      {list.error ? (
        <p role="alert" className="panel p-5">Couldn't load assignments. <Link href="/admin/assignments" className="underline">Retry</Link></p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone px-4 py-3 text-sm text-muted">
          {status === 'published' ? 'Nothing published. ' : status === 'draft' ? 'No drafts. ' : 'Nothing archived. '}
          {status !== 'archived' && <Link href="/admin/assignments/new" className="font-semibold text-ink underline underline-offset-4">Create an assignment</Link>}
        </p>
      ) : (
        <ul className="divide-y divide-rule border-b border-rule">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/assignments/${a.id}`} className="grid gap-1 py-3 hover:bg-surface sm:grid-cols-[minmax(0,1fr)_9rem_8rem_6rem] sm:items-center sm:gap-4 sm:px-2">
                <span className="font-semibold">{a.title}</span>
                <span className="text-sm text-muted">{levelLabel(a.level)}{a.department ? ` · ${a.department}` : ''}</span>
                <span className="num text-sm">{formatDateTime(a.due_at, { day: 'numeric', month: 'short' })} <span className="text-muted">({relativeDue(a.due_at)})</span></span>
                <span><StatusChip status={a.status} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-3">
        {page > 1 && <Link className="btn btn-outline" href={`/admin/assignments?status=${status}&page=${page - 1}`}>Newer</Link>}
        {hasMore && <Link className="btn btn-outline" href={`/admin/assignments?status=${status}&page=${page + 1}`}>More</Link>}
      </div>
    </div>
  );
}
