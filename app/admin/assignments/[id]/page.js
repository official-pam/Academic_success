import Link from 'next/link';
import { getDirectory } from '@/lib/catalogue';
import { RefreshingForm } from '@/components/RefreshingForm';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { lagosToday, formatDateTime } from '@/lib/dates';
import { isUuid } from '@/lib/admin';
import { AssignmentForm } from '@/components/admin/AssignmentForm';
import { StatusChip } from '@/components/admin/StatusChip';
import { setAssignmentStatus } from '../actions';

export const metadata = { title: 'Edit assignment' };

export default async function EditAssignment({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, profile } = await requireStaff();
  const { schools } = await getDirectory(supabase);
  const [{ data: a }, { data: audit }] = await Promise.all([
    supabase.from('assignments').select('*').eq('id', id).maybeSingle(),
    supabase.from('assignment_audit').select('id, actor, action, changed, at').eq('assignment_id', id).order('at', { ascending: false }).limit(20),
  ]);
  if (!a) notFound();
  const actorIds = [...new Set((audit || []).map((r) => r.actor).filter(Boolean))];
  const { data: actors } = actorIds.length ? await supabase.from('profiles').select('id, full_name').in('id', actorIds) : { data: [] };
  const nameOf = (uid) => actors?.find((p) => p.id === uid)?.full_name || 'A committee member';
  const dueLocal = new Date(new Date(a.due_at).getTime() + 3600 * 1000).toISOString();
  const initial = { ...a, due_date: dueLocal.slice(0, 10), due_time: dueLocal.slice(11, 16) };

  return (
    <div className="grid gap-6">
      <Link href="/admin/assignments" className="text-sm font-medium underline underline-offset-4">← Assignments</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="display text-[2.25rem] leading-[1.08]">Edit assignment</h1>
        <StatusChip status={a.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {a.status !== 'archived' && (
          <RefreshingForm action={setAssignmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="archived" /><button className="btn btn-outline">Archive</button></RefreshingForm>
        )}
        {a.status === 'archived' && (
          <RefreshingForm action={setAssignmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="draft" /><button className="btn btn-outline">Restore as draft</button></RefreshingForm>
        )}
        {a.status === 'published' && (
          <RefreshingForm action={setAssignmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="draft" /><button className="btn btn-outline">Unpublish</button></RefreshingForm>
        )}
      </div>
      <AssignmentForm schools={schools} assignment={initial} profile={profile} today={lagosToday()} />
      <section aria-labelledby="history">
        <h2 id="history" className="text-base font-bold">History</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {(audit || []).map((r) => (
            <li key={r.id} className="flex flex-wrap gap-x-2">
              <span className="num text-muted">{formatDateTime(r.at)}</span>
              <span><strong>{nameOf(r.actor)}</strong> {r.action === 'created' ? 'created it' : r.action === 'edited' ? `edited ${Object.keys(r.changed).join(', ')}` : `set it to ${r.action}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
