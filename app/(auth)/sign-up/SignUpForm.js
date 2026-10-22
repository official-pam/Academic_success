'use client';
import { useActionState } from 'react';
import { signUp } from '../actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

export function SignUpForm() {
  const [state, action] = useActionState(signUp, null);
  if (state?.confirmEmail) {
    return (
      <div role="status" className="panel mt-8 grid gap-2 p-5">
        <h2 className="text-lg font-bold">Check your email</h2>
        <p>We sent a confirmation link to <strong>{state.confirmEmail}</strong>. Open it on this phone to finish setting up. If it isn't there in a few minutes, check spam.</p>
      </div>
    );
  }
  return (
    <form action={action} className="mt-8 grid gap-5" noValidate>
      <div className="field">
        <label htmlFor="full_name" className="label">Full name</label>
        <input id="full_name" name="full_name" autoComplete="name" required maxLength={80} className="input" defaultValue={state?.values?.full_name} {...invalid(state, 'full_name')} />
        <FieldError state={state} name="full_name" />
      </div>
      <div className="field">
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="input" defaultValue={state?.values?.email} {...invalid(state, 'email')} />
        <FieldError state={state} name="email" />
      </div>
      <div className="field">
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" aria-describedby="pw-hint" {...invalid(state, 'password')} />
        <p id="pw-hint" className="hint">At least 8 characters.</p>
        <FieldError state={state} name="password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating account…" className="btn btn-primary w-full">Create account</SubmitButton>
      <p className="text-xs text-muted">
        We ask only for your name, level and department. No CGPA. <a href="/privacy" className="underline underline-offset-2">Who can see what</a>
      </p>
    </form>
  );
}
