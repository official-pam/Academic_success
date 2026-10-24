import Link from 'next/link';
import { requireMember, isStaff } from '@/lib/auth';
import { ROLE_LABEL, levelLabel } from '@/lib/constants';
import { PrivacyTable } from '@/components/PrivacyTable';
import { ProfileForm, SignOutButton, DeleteAccountForm } from './forms';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const { user, profile } = await requireMember();
  return (
    <div className="grid max-w-2xl gap-12">
      <section aria-labelledby="profile-heading" className="grid gap-6">
        <div>
          <h1 id="profile-heading" className="display text-[2.25rem] leading-[1.08]">Profile</h1>
          <p className="mt-1 text-sm text-muted">
            {user.email} · {ROLE_LABEL[profile.role]}{profile.role === 'coordinator' ? ` for ${levelLabel(profile.coordinator_level)}` : ''}
          </p>
        </div>
        {isStaff(profile) && (
          <Link href="/admin" className="panel flex items-center justify-between p-4 font-semibold hover:bg-stone/40">
            Committee tools <span aria-hidden="true">→</span>
          </Link>
        )}
        <ProfileForm profile={profile} />
      </section>
      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="text-lg font-bold">Who can see what</h2>
        <div className="panel mt-4 p-4"><PrivacyTable /></div>
      </section>
      <section aria-labelledby="account-heading" className="grid gap-3">
        <h2 id="account-heading" className="text-lg font-bold">Account</h2>
        <SignOutButton />
        <DeleteAccountForm />
      </section>
    </div>
  );
}
