import Link from 'next/link';
import { RefreshingForm } from '@/components/RefreshingForm';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { lagosToday, weekStart } from '@/lib/dates';
import { PrayerForm } from '@/components/admin/SimpleForms';
import { StatusChip } from '@/components/admin/StatusChip';
import { setPrayerStatus } from '../actions';
export const metadata = { title: 'Edit prayer points' };
export default async function EditPrayer({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireStaff();
  const { data: item } = await supabase.from('prayer_points').select('*').eq('id', id).maybeSingle();
  if (!item) notFound();
  return (
    <div className="grid gap-6">
      <Link href="/admin/prayer-points" className="text-sm font-medium underline underline-offset-4">← Prayer points</Link>
      <div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight">Edit prayer points</h1><StatusChip status={item.status} /></div>
      <RefreshingForm action={setPrayerStatus} className="flex gap-2">
        <input type="hidden" name="id" value={item.id} />
        {item.status !== 'archived'
          ? <button name="status" value="archived" className="btn btn-outline">Archive</button>
          : <button name="status" value="draft" className="btn btn-outline">Restore as draft</button>}
      </RefreshingForm>
      <PrayerForm item={item} thisMonday={weekStart(lagosToday())} />
    </div>
  );
}
