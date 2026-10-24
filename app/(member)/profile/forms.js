'use client';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { useActionState } from 'react';
import { updateProfile, deleteAccount } from './actions';
import { signOut } from '@/app/(auth)/actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';
import { LevelPicker, SchoolProgrammePicker } from '@/components/ProfileFields';
import { clearPageCache } from '@/components/ServiceWorker';

export function ProfileForm({ profile, schools, programmes }) {
  const [state, action] = useActionState(updateProfile, null);
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <div className="field">
        <label htmlFor="full_name" className="label">Full name</label>
        <input id="full_name" name="full_name" defaultValue={profile.full_name} autoComplete="name" className="input" {...invalid(state, 'full_name')} />
        <FieldError state={state} name="full_name" />
      </div>
      <LevelPicker state={state} defaultValue={profile.level} />
      <SchoolProgrammePicker state={state} schools={schools} programmes={programmes} defaultSchool={profile.school_code} defaultProgramme={profile.programme_id} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary justify-self-start">Save changes</SubmitButton>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => clearPageCache()}>
      <SubmitButton className="btn btn-outline" pendingLabel="Signing out…">Sign out</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, null);
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold text-danger">Delete my account</summary>
      <form action={action} onSubmit={() => clearPageCache()} className="mt-4 grid gap-4" noValidate>
        <p className="text-sm">This permanently deletes your profile, goals, plan and every check-in. It can't be undone.</p>
        <div className="field">
          <label htmlFor="confirm" className="label">Type DELETE to confirm</label>
          <input id="confirm" name="confirm" autoComplete="off" className="input max-w-48" {...invalid(state, 'confirm')} />
          <FieldError state={state} name="confirm" />
        </div>
        <FormMessage state={state} />
        <SubmitButton className="btn btn-danger justify-self-start" pendingLabel="Deleting…">Delete account</SubmitButton>
      </form>
    </details>
  );
}
