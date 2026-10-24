'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Student navigation (redesign): Today · Courses · Plan · Support · More.
// "More" holds Updates, Profile, Privacy and, for staff, the Committee workspace.
const ITEMS = [
  {
    href: '/today',
    label: 'Today',
    match: ['/today'],
    icon: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  },
  {
    href: '/courses',
    label: 'Courses',
    match: ['/courses', '/focus'],
    icon: 'M12 4 3 8.5l9 4.5 9-4.5zM3 12.5l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  },
  {
    href: '/plan',
    label: 'Plan',
    match: ['/plan'],
    icon: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v4M16 4v4',
  },
  {
    href: '/support',
    label: 'Support',
    match: ['/support'],
    icon: 'M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8.5z',
  },
  {
    href: '/more',
    label: 'More',
    match: ['/more', '/updates', '/assignments', '/profile', '/verses'],
    dots: true,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 md:flex md:max-w-none md:gap-1">
        {ITEMS.map((item) => {
          const active = item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] md:min-h-10 md:flex-row md:rounded-full md:px-4 md:text-sm ${
                  active ? 'font-bold text-ink md:bg-lavender-wash md:text-lavender-ink' : 'font-medium text-muted hover:text-ink'
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="md:hidden">
                  {item.dots ? (
                    [6, 12, 18].map((cx) => <circle key={cx} cx={cx} cy="12" r={active ? 2 : 1.6} fill="currentColor" />)
                  ) : (
                    <path
                      d={item.icon}
                      fill={active ? 'currentColor' : 'none'}
                      fillOpacity={active ? 0.12 : 0}
                      stroke="currentColor"
                      strokeWidth={active ? 2 : 1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
