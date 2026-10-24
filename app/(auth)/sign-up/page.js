import Link from 'next/link';
import { SignUpForm } from './SignUpForm';

export const metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <>
      <h1 className="display text-[2.25rem] leading-[1.08]">Create your account</h1>
      <p className="mt-2 text-base text-muted">For TLV choir members, 100L to 500L. It takes a minute.</p>
      <SignUpForm />
      <p className="mt-8 text-sm">
        Already have an account? <Link href="/sign-in" className="font-semibold underline underline-offset-4">Sign in</Link>
      </p>
    </>
  );
}
