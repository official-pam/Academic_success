'use client';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { useActionState } from 'react';
import { setRole } from './actions';
import { SubmitButton } from '@/components/forms';
import { LEVELS } from '@/lib/constants';

export function RoleForm({ person }) {
  const [state, action] = useActionState(setRole, null);
  useRefreshOnSuccess(state);
  const current = person.role === 'coordinator' ? `coordinator:${person.coordinator_level}` : person.role;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={person.id} />
      <label className="sr-only" htmlFor={`role-${person.id}`}>Role for {person.full_name}</label>
      <select id={`role-${person.id}`} name="role" defaultValue={current} className="input min-h-10 w-auto py-0 text-sm">
        <option value="member">Member</option>
        {LEVELS.map((l) => <option key={l} value={`coordinator:${l}`}>Coordinator, {l}L</option>)}
        <option value="chairman">Chairman</option>
      </select>
      <SubmitButton className="btn btn-outline min-h-10 px-3 text-sm" pendingLabel="Saving…">Save</SubmitButton>
      {state?.message && <span role={state.ok ? 'status' : 'alert'} className={`text-xs ${state.ok ? 'text-sage-ink' : 'text-danger'}`}>{state.message}</span>}
    </form>
  );
}
