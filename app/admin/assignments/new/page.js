import Link from 'next/link';
import { getDirectory } from '@/lib/catalogue';
import { requireStaff } from '@/lib/auth';
import { lagosToday } from '@/lib/dates';
import { AssignmentForm } from '@/components/admin/AssignmentForm';

export const metadata = { title: 'New assignment' };

export default async function NewAssignment() {
  const { supabase, profile } = await requireStaff();
  const { schools } = await getDirectory(supabase);
  return (
    <div className="grid gap-6">
      <Link href="/admin/assignments" className="text-sm font-medium underline underline-offset-4">← Assignments</Link>
      <h1 className="display text-[2.25rem] leading-[1.08]">New assignment</h1>
      <AssignmentForm schools={schools} profile={profile} today={lagosToday()} />
    </div>
  );
}
