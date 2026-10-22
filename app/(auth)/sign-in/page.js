import Link from 'next/link';
import { SignInForm } from './SignInForm';

export const metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-base text-muted">Pick up today's reading where you left it.</p>
      {error === 'link' && (
        <p role="alert" className="notice mt-6">That link has expired or was already used. Sign in, or request a new link.</p>
      )}
      <SignInForm next={next} />
      <p className="mt-8 text-sm">
        New to TLV Academic? <Link href="/sign-up" className="font-semibold underline underline-offset-4">Create an account</Link>
      </p>
    </>
  );
}
