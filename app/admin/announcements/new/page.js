import Link from 'next/link';
import { getDirectory } from '@/lib/catalogue';
import { requireStaff } from '@/lib/auth';
import { AnnouncementForm } from '@/components/admin/SimpleForms';
export const metadata = { title: 'New announcement' };
export default async function NewAnnouncement() {
  const { supabase, profile } = await requireStaff();
  const { schools } = await getDirectory(supabase);
  return (
    <div className="grid gap-6">
      <Link href="/admin/announcements" className="text-sm font-medium underline underline-offset-4">← Announcements</Link>
      <h1 className="display text-[2.25rem] leading-[1.08]">New announcement</h1>
      <AnnouncementForm schools={schools} profile={profile} />
    </div>
  );
}
