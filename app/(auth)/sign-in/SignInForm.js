'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { signIn } from '../actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

export function SignInForm({ next }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-8 grid gap-5" noValidate>
      <input type="hidden" name="next" value={next || ''} />
      <div className="field">
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" defaultValue={state?.values?.email} {...invalid(state, 'email')} />
        <FieldError state={state} name="email" />
      </div>
      <div className="field">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">Password</label>
          <Link href="/reset" className="text-sm font-medium underline underline-offset-4">Forgot it?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" {...invalid(state, 'password')} />
        <FieldError state={state} name="password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in…" className="btn btn-primary w-full">Sign in</SubmitButton>
    </form>
  );
}
