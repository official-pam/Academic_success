import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Wordmark } from '@/components/Mark';
import { OnboardingForm } from './OnboardingForm';

export const metadata = { title: 'Set up' };

export default async function OnboardingPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect('/sign-in');
  if (profile?.onboarded_at) redirect('/today');
  return (
    <main id="main" className="mx-auto max-w-md px-5 py-8">
      <Wordmark />
      <h1 className="mt-10 display text-[2.25rem] leading-[1.08]">Set up your reading</h1>
      <p className="mt-2 text-base text-muted">
        Your level and department decide which assignments and updates you see.
      </p>
      <OnboardingForm defaults={{ full_name: profile?.full_name || user.user_metadata?.full_name || '' }} />
    </main>
  );
}
