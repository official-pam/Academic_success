import Link from 'next/link';
import { getDirectory } from '@/lib/catalogue';
import { RefreshingForm } from '@/components/RefreshingForm';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/admin';
import { AnnouncementForm } from '@/components/admin/SimpleForms';
import { StatusChip } from '@/components/admin/StatusChip';
import { setAnnouncementStatus } from '../actions';
export const metadata = { title: 'Edit announcement' };
export default async function EditAnnouncement({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, profile } = await requireStaff();
  const { schools } = await getDirectory(supabase);
  const { data: item } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle();
  if (!item) notFound();
  return (
    <div className="grid gap-6">
      <Link href="/admin/announcements" className="text-sm font-medium underline underline-offset-4">← Announcements</Link>
      <div className="flex items-center gap-3"><h1 className="display text-[2.25rem] leading-[1.08]">Edit announcement</h1><StatusChip status={item.status} /></div>
      <RefreshingForm action={setAnnouncementStatus} className="flex gap-2">
        <input type="hidden" name="id" value={item.id} />
        {item.status !== 'archived'
          ? <button name="status" value="archived" className="btn btn-outline">Archive</button>
          : <button name="status" value="draft" className="btn btn-outline">Restore as draft</button>}
      </RefreshingForm>
      <AnnouncementForm schools={schools} item={item} profile={profile} />
    </div>
  );
}
