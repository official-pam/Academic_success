import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { formatDateTime, relativeDue } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';
import { RichText, ResourceList } from '@/components/RichText';

export default async function AssignmentPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireMember();
  const { data: a } = await supabase.from('assignments').select('id, title, instructions, resources, due_at, level, department').eq('id', id).eq('status', 'published').maybeSingle();
  if (!a) notFound();
  const overdue = new Date(a.due_at) < new Date();
  return (
    <article className="max-w-2xl">
      <Link href="/plan" className="text-sm font-medium underline underline-offset-4">← Plan</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{a.title}</h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted">Due</dt>
        <dd className={overdue ? 'font-semibold text-danger' : 'font-semibold'}>
          {formatDateTime(a.due_at, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })} ({relativeDue(a.due_at)})
        </dd>
        <dt className="text-muted">For</dt>
        <dd>{levelLabel(a.level)}{a.department ? ` · ${a.department}` : ' · all departments'}</dd>
      </dl>
      <h2 className="mt-8 text-base font-bold">Instructions</h2>
      {a.instructions ? <RichText text={a.instructions} className="mt-2" /> : <p className="mt-2 text-muted">No extra instructions.</p>}
      {a.resources && (
        <>
          <h2 className="mt-8 text-base font-bold">Resources</h2>
          <div className="mt-2"><ResourceList text={a.resources} /></div>
        </>
      )}
      <p className="mt-10 text-sm text-muted">Tip: add a reading session for this in <Link href="/plan#add" className="underline underline-offset-4">your plan</Link>.</p>
    </article>
  );
}
