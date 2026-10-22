'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/today', label: 'Today', icon: 'M4 12h16M12 4v16' },
  { href: '/plan', label: 'Plan', icon: 'M5 5h14v14H5zM5 10h14M10 5v14' },
  { href: '/support', label: 'Support', icon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' },
  { href: '/updates', label: 'Updates', icon: 'M5 6h14M5 12h14M5 18h9' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0">
      <ul className="mx-auto grid max-w-xl grid-cols-4 md:flex md:max-w-none md:gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs md:min-h-10 md:flex-row md:rounded-md md:px-3 md:text-sm ${
                  active ? 'font-bold text-ink md:bg-stone/60' : 'font-medium text-muted hover:text-ink'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} aria-hidden="true" className="md:hidden">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
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
