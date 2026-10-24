'use client';
import { useActionState } from 'react';
import { updatePassword } from '../../actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

export default function UpdatePasswordPage() {
  const [state, action] = useActionState(updatePassword, null);
  return (
    <>
      <h1 className="display text-[2.25rem] leading-[1.08]">Choose a new password</h1>
      <form action={action} className="mt-8 grid gap-5" noValidate>
        <div className="field">
          <label htmlFor="password" className="label">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" {...invalid(state, 'password')} />
          <FieldError state={state} name="password" />
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Saving…" className="btn btn-primary w-full">Save password</SubmitButton>
      </form>
    </>
  );
}
