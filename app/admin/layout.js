import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { Wordmark } from '@/components/Mark';
import { AdminNav } from '@/components/admin/AdminNav';
import { roleLine } from '@/lib/constants';

export const metadata = { title: { default: 'Committee', template: '%s · Committee · TLV Academic' } };

export default async function AdminLayout({ children }) {
  const { supabase, profile } = await requireStaff();
  const [feed, waiting] = await Promise.all([
    supabase.rpc('mentor_feed_unread'),
    supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).is('prayed_at', null).neq('user_id', profile.id),
  ]);
  const unread = Number(feed.data || 0);
  const waitingPrayers = waiting.count || 0;
  const chairman = profile.role === 'chairman';
  const scope = roleLine(profile);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-rule px-4 pb-2 pt-4 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-b-0 md:border-r md:px-3 md:py-5">
        <div className="flex items-center justify-between md:block md:px-2">
          <Link href="/admin" className="rounded"><Wordmark /></Link>
          <p className="text-xs text-muted md:mt-3">{scope}</p>
        </div>
        <div className="mt-3 md:mt-6"><AdminNav chairman={chairman} unread={unread} waitingPrayers={waitingPrayers} /></div>
        <div className="hidden md:mt-auto md:block md:px-2">
          <Link href="/today" className="text-sm font-medium underline underline-offset-4">← Back to my app</Link>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
        <p className="mt-12 md:hidden"><Link href="/today" className="text-sm font-medium underline underline-offset-4">← Back to my app</Link></p>
      </main>
    </div>
  );
}
