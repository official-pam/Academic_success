'use client';
import { useActionState, useState } from 'react';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { setRole } from './actions';
import { SubmitButton } from '@/components/forms';
import { LEVELS } from '@/lib/constants';

export function RoleForm({ person, schools, isSelf }) {
  const [state, action] = useActionState(setRole, null);
  useRefreshOnSuccess(state);
  const [role, setRoleValue] = useState(person.role);
  const id = person.id;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Role
        <select name="role" value={role} onChange={(e) => setRoleValue(e.target.value)} disabled={isSelf}
          aria-label={`Role for ${person.full_name}`} className="input min-h-10 w-auto py-0 text-sm text-ink">
          <option value="member">Member</option>
          <option value="coordinator">Committee head</option>
          <option value="chairman">Admin</option>
        </select>
      </label>
      {role === 'coordinator' && (
        <>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            School
            <select name="committee_school" defaultValue={person.committee_school || person.school_code || ''} required
              aria-label={`School ${person.full_name} looks after`} className="input min-h-10 w-auto py-0 text-sm text-ink">
              <option value="" disabled>Choose</option>
              {schools.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Level
            <select name="coordinator_level" defaultValue={person.coordinator_level || 'all'}
              aria-label={`Level ${person.full_name} looks after`} className="input min-h-10 w-auto py-0 text-sm text-ink">
              <option value="all">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
            </select>
          </label>
        </>
      )}
      {isSelf ? (
        <p className="pb-2 text-xs text-muted">This is you. Edit your own details in Profile.</p>
      ) : (
        <SubmitButton className="btn btn-outline min-h-10 px-4 text-sm" pendingLabel="Saving…">Save</SubmitButton>
      )}
      {state?.message && <span role={state.ok ? 'status' : 'alert'} className={`pb-2 text-xs ${state.ok ? 'text-sage-ink' : 'text-danger'}`}>{state.message}</span>}
    </form>
  );
}
