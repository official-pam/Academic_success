'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNav({ chairman }) {
  const pathname = usePathname();
  const items = [
    { href: '/admin', label: 'Participation', exact: true },
    { href: '/admin/assignments', label: 'Assignments' },
    { href: '/admin/announcements', label: 'Announcements' },
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
                className={`flex min-h-10 items-center whitespace-nowrap rounded-md px-3 text-sm ${active ? 'bg-stone/70 font-bold text-ink' : 'text-muted hover:text-ink'}`}>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
