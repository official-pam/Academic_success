import Link from 'next/link';
import { requireMember, isStaff } from '@/lib/auth';
import { roleLine } from '@/lib/constants';
import { getDirectory } from '@/lib/catalogue';
import { PrivacyTable } from '@/components/PrivacyTable';
import { ProfileForm, SignOutButton, DeleteAccountForm } from './forms';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireMember();
  const { schools, programmes } = await getDirectory(supabase);
  return (
    <div className="grid max-w-2xl gap-12">
      <section aria-labelledby="profile-heading" className="grid gap-6">
        <div>
          <h1 id="profile-heading" className="display text-[2.25rem] leading-[1.08]">Profile</h1>
          <p className="mt-1 text-sm text-muted">
            {user.email} · {roleLine(profile)}
          </p>
        </div>
        {isStaff(profile) && (
          <Link href="/admin" className="panel flex items-center justify-between p-4 font-semibold hover:bg-stone/40">
            Committee workspace <span aria-hidden="true">→</span>
          </Link>
        )}
        {!profile.school_code && (
          <p role="status" className="notice">Choose your school and programme below so you see the right courses and your committee head.</p>
        )}
        <ProfileForm profile={profile} schools={schools} programmes={programmes} />
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
