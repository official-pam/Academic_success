import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { Wordmark } from '@/components/Mark';
import { BottomNav } from '@/components/BottomNav';

export default async function MemberLayout({ children }) {
  const { profile } = await requireMember();
  const initial = (profile.full_name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-6">
        <Link href="/today" className="flex min-h-11 items-center rounded" aria-label="TLV Academic, Today">
          <Wordmark />
        </Link>
        <div className="hidden md:block"><BottomNav /></div>
        <div className="flex items-center gap-1">
          {/* Updates live under More; the bell is a shortcut to them. */}
          <Link href="/updates" aria-label="Updates from the committee" className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/profile" aria-label="Profile and settings" className="flex size-11 items-center justify-center rounded-full">
            <span className="flex size-9 items-center justify-center rounded-full bg-lavender-wash text-sm font-bold text-lavender-ink ring-2 ring-surface">
              {initial}
            </span>
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 pt-6 md:px-6 md:pt-10">{children}</main>
      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
