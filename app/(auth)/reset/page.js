'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { requestReset } from '../actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

export default function ResetPage() {
  const [state, action] = useActionState(requestReset, null);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-base text-muted">We'll email you a link to choose a new one.</p>
      <form action={action} className="mt-8 grid gap-5" noValidate>
        <div className="field">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" {...invalid(state, 'email')} />
          <FieldError state={state} name="email" />
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Sending…" className="btn btn-primary w-full">Send reset link</SubmitButton>
      </form>
      <p className="mt-8 text-sm"><Link href="/sign-in" className="font-semibold underline underline-offset-4">Back to sign in</Link></p>
    </>
  );
}
