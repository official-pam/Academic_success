import Link from 'next/link';
import { requireMember, isStaff } from '@/lib/auth';
import { Wordmark } from '@/components/Mark';
import { BottomNav } from '@/components/BottomNav';

export default async function MemberLayout({ children }) {
  const { profile } = await requireMember();
  const initial = (profile.full_name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-4 md:px-6 md:pt-6">
        <Link href="/today" className="rounded" aria-label="TLV Academic, Today"><Wordmark /></Link>
        <div className="hidden md:block"><BottomNav /></div>
        <div className="flex items-center gap-2">
          {isStaff(profile) && (
            <Link href="/admin" className="btn btn-outline min-h-9 px-3 text-xs">Committee</Link>
          )}
          <Link href="/profile" aria-label="Profile and settings" className="flex size-11 items-center justify-center rounded-full bg-stone text-sm font-bold text-ink hover:bg-[#cfcabb]">
            {initial}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-8 md:px-6">{children}</main>
      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
