'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav({ chairman, unread = 0, waitingPrayers = 0 }) {
  const pathname = usePathname();
  const items = [
    { href: '/admin/students', label: 'Students' },
    { href: '/admin/activity', label: 'Activity', count: unread },
    { href: '/admin', label: 'Participation', exact: true },
    { href: '/admin/assignments', label: 'Assignments' },
    { href: '/admin/announcements', label: 'Announcements' },
    { href: '/admin/prayer-requests', label: 'Prayer requests', count: waitingPrayers },
    { href: '/admin/prayer-points', label: 'Prayer points' },
    ...(chairman ? [{ href: '/admin/people', label: 'People and roles' }] : []),
  ];
  return (
    <nav aria-label="Committee">
      <ul className="flex gap-1 overflow-x-auto pb-1 md:grid md:gap-0.5 md:overflow-visible md:pb-0">
        {items.map((i) => {
          const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
          return (
            <li key={i.href} className="shrink-0">
              <Link href={i.href} aria-current={active ? 'page' : undefined}
                className={`flex min-h-10 items-center whitespace-nowrap rounded-md px-3 text-sm ${active ? 'bg-lavender-wash font-bold text-lavender-ink' : 'text-muted hover:text-ink'}`}>
                {i.label}
                {i.count > 0 && !active && <span className="num ml-2 rounded-full bg-rose-ink px-1.5 text-[0.6875rem] font-bold text-white">{i.count > 99 ? '99+' : i.count}<span className="sr-only"> new</span></span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
