'use client';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { useActionState, useEffect, useRef, useState } from 'react';
import { setGoal, addSession } from './actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

export function GoalForm({ goal }) {
  const [state, action] = useActionState(setGoal, null);
  useRefreshOnSuccess(state);
  const [open, setOpen] = useState(!goal);
  useEffect(() => { if (state?.ok) setOpen(false); }, [state]);
  if (!open) {
    return (
      <div className="grid gap-2">
        <FormMessage state={state} />
        <button type="button" className="btn btn-outline justify-self-start" onClick={() => setOpen(true)}>Change goal</button>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4" noValidate>
      <div className="field">
        <label htmlFor="goal-title" className="label">Goal</label>
        <input id="goal-title" name="title" defaultValue={goal?.title} placeholder="Read 2 chapters" className="input" {...invalid(state, 'title')} />
        <FieldError state={state} name="title" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="goal-days" className="label">Days a week</label>
          <select id="goal-days" name="days_per_week" defaultValue={goal?.days_per_week ?? 5} className="input" {...invalid(state, 'days_per_week')}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <FieldError state={state} name="days_per_week" />
        </div>
        <div className="field">
          <label htmlFor="goal-min" className="label">Minutes a day</label>
          <input id="goal-min" name="minutes_per_day" type="number" inputMode="numeric" min="5" max="600" defaultValue={goal?.minutes_per_day ?? ''} placeholder="Optional" className="input num" {...invalid(state, 'minutes_per_day')} />
          <FieldError state={state} name="minutes_per_day" />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-3">
        <SubmitButton>Save goal</SubmitButton>
        {goal && <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>}
      </div>
    </form>
  );
}

export function AddSessionForm({ today }) {
  const [state, action] = useActionState(addSession, null);
  useRefreshOnSuccess(state);
  const formRef = useRef(null);
  useEffect(() => { if (state?.reset) formRef.current?.reset(); }, [state?.reset]);
  const v = state?.ok ? {} : state?.values || {};
  return (
    <form ref={formRef} action={action} className="grid gap-4" noValidate>
      <fieldset className="grid gap-2">
        <legend className="label">What is it?</legend>
        <div className="grid grid-cols-2 gap-2">
          {[['reading', 'Reading session'], ['exam', 'Exam']].map(([val, label]) => (
            <label key={val} className="relative">
              <input type="radio" name="kind" value={val} defaultChecked={(v.kind || 'reading') === val} className="peer sr-only" />
              <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-stone bg-surface text-sm font-semibold peer-checked:border-lavender-strong peer-checked:bg-lavender-strong peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ink">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="s-title" className="label">Title</label>
        <input id="s-title" name="title" defaultValue={v.title} placeholder="MTH 101 chapter 3" className="input" {...invalid(state, 'title')} />
        <FieldError state={state} name="title" />
      </div>
      <div className="grid grid-cols-[1.3fr_1fr] gap-3">
        <div className="field">
          <label htmlFor="s-date" className="label">Date</label>
          <input id="s-date" name="starts_on" type="date" min={today} defaultValue={v.starts_on || today} className="input" {...invalid(state, 'starts_on')} />
          <FieldError state={state} name="starts_on" />
        </div>
        <div className="field">
          <label htmlFor="s-time" className="label">Time</label>
          <input id="s-time" name="start_time" type="time" defaultValue={v.start_time || ''} className="input" {...invalid(state, 'start_time')} />
          <FieldError state={state} name="start_time" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="s-dur" className="label">Length in minutes <span className="font-normal text-muted">(optional)</span></label>
        <input id="s-dur" name="duration_min" type="number" inputMode="numeric" min="5" max="600" defaultValue={v.duration_min ?? ''} className="input num max-w-32" {...invalid(state, 'duration_min')} />
        <FieldError state={state} name="duration_min" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Adding…" className="btn btn-primary justify-self-start">Add to plan</SubmitButton>
    </form>
  );
}
