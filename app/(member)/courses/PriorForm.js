'use client';
import { useActionState } from 'react';
import { savePrior } from './actions';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

/** CGPA from before the member started recording results here, so the CGPA shown is complete. */
export function PriorForm({ profile }) {
  const [state, action] = useActionState(savePrior, null);
  useRefreshOnSuccess(state);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="prior_cgpa" className="label">CGPA so far</label>
          <input id="prior_cgpa" name="prior_cgpa" type="number" inputMode="decimal" step="0.01" min="0" max="5" defaultValue={profile.prior_cgpa ?? ''} placeholder="e.g. 3.85" className="input num" {...invalid(state, 'prior_cgpa')} />
          <FieldError state={state} name="prior_cgpa" />
        </div>
        <div className="field">
          <label htmlFor="prior_units" className="label">Units completed</label>
          <input id="prior_units" name="prior_units" type="number" inputMode="numeric" min="1" max="400" defaultValue={profile.prior_units ?? ''} placeholder="e.g. 96" className="input num" {...invalid(state, 'prior_units')} />
          <FieldError state={state} name="prior_units" />
        </div>
      </div>
      <p className="hint">From your last result slip, before the courses you record here. Leave both empty if you're in your first semester.</p>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-soft justify-self-start" pendingLabel="Saving…">Save</SubmitButton>
    </form>
  );
}
