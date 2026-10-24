import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { lagosToday, weekStart } from '@/lib/dates';
import { PrayerForm } from '@/components/admin/SimpleForms';
export const metadata = { title: 'New prayer points' };
export default async function NewPrayer() {
  await requireStaff();
  return (
    <div className="grid gap-6">
      <Link href="/admin/prayer-points" className="text-sm font-medium underline underline-offset-4">← Prayer points</Link>
      <h1 className="display text-[2.25rem] leading-[1.08]">Prayer points for a week</h1>
      <PrayerForm thisMonday={weekStart(lagosToday())} />
    </div>
  );
}
