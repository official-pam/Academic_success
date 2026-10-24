import Link from 'next/link';
import { requireMember, isStaff } from '@/lib/auth';
import { roleLine } from '@/lib/constants';
import { SignOutButton } from '../profile/forms';
import { InstallApp } from '@/components/InstallApp';

export const metadata = { title: 'More' };

const ICONS = {
  updates: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  privacy: 'M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6zM9.5 12l2 2 3.5-4',
  verses: 'M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13',
  committee: 'M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6z',
};

function Row({ href, icon, tone, title, detail }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-paper">
        <span className={`icon-tile ${tone}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d={ICONS[icon]} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted">{detail}</span>
        </span>
        <span aria-hidden="true" className="text-muted">›</span>
      </Link>
    </li>
  );
}

export default async function MorePage() {
  const { user, profile } = await requireMember();
  return (
    <div className="grid max-w-xl gap-8">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="display mt-2 text-[2.25rem] leading-[1.08]">More</h1>
        <p className="mt-2 text-sm text-muted">
          {user.email} · {roleLine(profile)}
        </p>
      </div>

      <ul className="panel divide-y divide-rule overflow-hidden">
        <Row href="/verses" icon="verses" tone="bg-rose-wash text-rose-ink" title="Memory verses" detail="Today's verse, past verses and the ones you've memorised" />
        <Row href="/updates" icon="updates" tone="bg-lavender-wash text-lavender-ink" title="Updates" detail="Announcements and assignments from the committee" />
        <Row href="/profile" icon="profile" tone="bg-sage-wash text-sage-ink" title="Profile" detail="Name, school, programme, level and account" />
        <Row href="/privacy" icon="privacy" tone="bg-slate-wash text-slate-ink" title="Who can see what" detail="What the committee can and can't see" />
        {isStaff(profile) && (
          <Row href="/admin" icon="committee" tone="bg-stone text-ink" title="Committee workspace" detail="Students, activity, publishing and participation" />
        )}
      </ul>

      <InstallApp compact />
      <SignOutButton />
    </div>
  );
}
