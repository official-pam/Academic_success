import Link from 'next/link';
import { Wordmark } from '@/components/Mark';
import { PrivacyTable } from '@/components/PrivacyTable';

export const metadata = { title: 'Who can see what' };

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto max-w-xl px-5 py-8">
      <Link href="/today" aria-label="TLV Academic home"><Wordmark /></Link>
      <h1 className="mt-10 display text-[2.25rem] leading-[1.08]">Who can see what</h1>
      <p className="mt-3 text-base">
        This app exists to help you read consistently and to help the committee notice when a level needs
        support, never to rank or shame anyone. We collect only what that needs.
      </p>
      <div className="panel mt-8 p-5"><PrivacyTable /></div>
      <h2 className="mt-10 text-lg font-bold">Your choices</h2>
      <ul className="mt-3 grid list-disc gap-2 pl-5 text-base">
        <li>Correct your name, level or department any time in Profile.</li>
        <li>Delete your account in Profile. Your check-ins, goals and plan are deleted with it.</li>
        <li>At the end of the tenure the committee hands over totals only, never individual records.</li>
      </ul>
    </main>
  );
}
