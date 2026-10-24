'use client';
import { useActionState, useEffect, useRef } from 'react';
import { addMemberPoint, sendPrayerRequest } from './actions';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

function useReset(state) {
  const ref = useRef(null);
  useEffect(() => { if (state?.reset) ref.current?.reset(); }, [state?.reset]);
  return ref;
}

export function MemberPointForm() {
  const [state, action] = useActionState(addMemberPoint, null);
  useRefreshOnSuccess(state);
  const ref = useReset(state);
  return (
    <form ref={ref} action={action} className="grid gap-3" noValidate>
      <div className="field">
        <label htmlFor="member-point" className="label">Share a prayer point</label>
        <textarea id="member-point" name="body" rows={2} maxLength={400} className="input" placeholder="e.g. For strength for everyone writing exams this week" {...invalid(state, 'body')} />
        <FieldError state={state} name="body" />
        <p className="hint">Everyone in the app can read this, with your first name. Keep private things for a prayer request.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-soft justify-self-start" pendingLabel="Sharing…">Share</SubmitButton>
    </form>
  );
}

export function PrayerRequestForm({ headName }) {
  const [state, action] = useActionState(sendPrayerRequest, null);
  useRefreshOnSuccess(state);
  const ref = useReset(state);
  return (
    <form ref={ref} action={action} className="grid gap-3" noValidate>
      <div className="field">
        <label htmlFor="prayer-request" className="label">What should we pray about?</label>
        <textarea id="prayer-request" name="body" rows={3} maxLength={1000} className="input" {...invalid(state, 'body')} />
        <FieldError state={state} name="body" />
        <p className="hint">Private: only {headName ? `${headName} (your committee head)` : 'your committee head'} and the admin can read it.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-accent justify-self-start" pendingLabel="Sending…">Send prayer request</SubmitButton>
    </form>
  );
}
