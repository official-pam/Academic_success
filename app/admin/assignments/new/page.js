import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { lagosToday } from '@/lib/dates';
import { AssignmentForm } from '@/components/admin/AssignmentForm';

export const metadata = { title: 'New assignment' };

export default async function NewAssignment() {
  const { profile } = await requireStaff();
  return (
    <div className="grid gap-6">
      <Link href="/admin/assignments" className="text-sm font-medium underline underline-offset-4">← Assignments</Link>
      <h1 className="text-2xl font-bold tracking-tight">New assignment</h1>
      <AssignmentForm profile={profile} today={lagosToday()} />
    </div>
  );
}
