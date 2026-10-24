import Link from 'next/link';
import { requireMember, isStaff } from '@/lib/auth';
import { Wordmark } from '@/components/Mark';
import { BottomNav } from '@/components/BottomNav';

export default async function MemberLayout({ children }) {
  const { supabase, profile } = await requireMember();
  // Committee heads and the admin: the bell is their activity feed, with a count of what's new.
  const staff = isStaff(profile);
  const unread = staff ? Number((await supabase.rpc('mentor_feed_unread')).data || 0) : 0;
  const initial = (profile.full_name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-6">
        <Link href="/today" className="flex min-h-11 items-center rounded" aria-label="TLV Academic, Today">
          <Wordmark />
        </Link>
        <div className="hidden md:block"><BottomNav /></div>
        <div className="flex items-center gap-1">
          {/* Members: the bell opens Updates. Committee: it opens student activity, with a count of what's new. */}
          <Link
            href={staff ? '/admin/activity' : '/updates'}
            aria-label={staff ? `Student activity${unread ? `, ${unread} new` : ''}` : 'Updates from the committee'}
            className="relative flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone/60"
          >
            {unread > 0 && (
              <span aria-hidden="true" className="num absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-ink px-1 text-[0.6875rem] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
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
      <main id="main" className="mx-auto max-w-3xl px-5 pt-6 md:px-6 md:pt-10">
        {!profile.school_code && (
          <p role="status" className="notice mb-6">
            New: choose your school and programme in <Link href="/profile" className="font-semibold underline underline-offset-2">Profile</Link> to get your course list and your committee head.
          </p>
        )}
        {children}
      </main>
      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
