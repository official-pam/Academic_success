'use client';
import { useActionState } from 'react';
import { completeOnboarding } from './actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';
import { LevelPicker, SchoolProgrammePicker } from '@/components/ProfileFields';

export function OnboardingForm({ defaults, schools, programmes }) {
  const [state, action] = useActionState(completeOnboarding, null);
  const v = state?.values || defaults;
  return (
    <form action={action} className="mt-8 grid gap-6" noValidate>
      <div className="field">
        <label htmlFor="full_name" className="label">Full name</label>
        <input id="full_name" name="full_name" autoComplete="name" className="input" defaultValue={v.full_name} {...invalid(state, 'full_name')} />
        <FieldError state={state} name="full_name" />
      </div>
      <LevelPicker state={state} defaultValue={v.level} />
      <SchoolProgrammePicker state={state} schools={schools} programmes={programmes} defaultSchool={v.school_code} defaultProgramme={v.programme_id} />
      <fieldset className="grid gap-2">
        <legend className="label">How many days a week will you read?</legend>
        <p className="hint">Start small. You can change this any time in Plan.</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {[3, 5, 7].map((d) => (
            <label key={d} className="relative">
              <input type="radio" name="days_per_week" value={d} defaultChecked={(v.days_per_week || 5) === d} className="peer sr-only" />
              <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-stone bg-surface text-sm font-semibold peer-checked:border-lavender-strong peer-checked:bg-lavender-strong peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ink">
                {d} days
              </span>
            </label>
          ))}
        </div>
        <FieldError state={state} name="days_per_week" />
      </fieldset>
      <p className="text-sm text-muted">
        Your committee head (mentor) for your school and the admin can see your courses, targets, results and
        study sessions so they can support you. Your check-in notes stay private.{' '}
        <a href="/privacy" className="underline underline-offset-2">Who can see what</a>
      </p>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…" className="btn btn-primary w-full">Start reading</SubmitButton>
    </form>
  );
}
