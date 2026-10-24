import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { formatDateTime } from '@/lib/dates';
import { levelLabel } from '@/lib/constants';
import { RichText } from '@/components/RichText';

export default async function AnnouncementPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireMember();
  const { data: a } = await supabase.from('announcements').select('id, title, body, level, published_at').eq('id', id).eq('status', 'published').maybeSingle();
  if (!a) notFound();
  return (
    <article className="max-w-2xl">
      <Link href="/updates" className="text-sm font-medium underline underline-offset-4">← Updates</Link>
      <h1 className="mt-4 display text-[2.25rem] leading-[1.08]">{a.title}</h1>
      <p className="mt-2 text-sm text-muted">{formatDateTime(a.published_at, { weekday: 'long', day: 'numeric', month: 'long' })} · {levelLabel(a.level)}</p>
      <RichText text={a.body} className="mt-6" />
    </article>
  );
}
