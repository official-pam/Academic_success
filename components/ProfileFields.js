'use client';
import { FieldError, invalid } from '@/components/forms';
import { LEVELS } from '@/lib/constants';

export function LevelPicker({ state, defaultValue, name = 'level', legend = 'Level' }) {
  return (
    <fieldset className="grid gap-2" {...(state?.errors?.[name] ? { 'aria-describedby': `${name}-error` } : {})}>
      <legend className="label">{legend}</legend>
      <div className="mt-1 grid grid-cols-5 gap-2">
        {LEVELS.map((l) => (
          <label key={l} className="relative">
            <input type="radio" name={name} value={l} defaultChecked={Number(defaultValue) === l} className="peer sr-only" />
            <span className="num flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-stone bg-surface text-sm font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-ink">
              {l}L
            </span>
          </label>
        ))}
      </div>
      <FieldError state={state} name={name} />
    </fieldset>
  );
}

// Suggestions only; members can type any department.
const DEPARTMENTS = [
  'Agricultural Economics', 'Architecture', 'Biochemistry', 'Chemistry', 'Chemical Engineering', 'Civil Engineering',
  'Computer Engineering', 'Computer Science', 'Cyber Security', 'Electrical Engineering', 'Estate Management',
  'Geology', 'Industrial Chemistry', 'Information Technology', 'Mathematics', 'Mechanical Engineering',
  'Microbiology', 'Physics', 'Quantity Surveying', 'Statistics', 'Urban and Regional Planning',
];

export function DepartmentInput({ state, defaultValue }) {
  return (
    <div className="field">
      <label htmlFor="department" className="label">Department</label>
      <input id="department" name="department" list="departments" autoComplete="off" className="input" defaultValue={defaultValue} {...invalid(state, 'department')} />
      <datalist id="departments">{DEPARTMENTS.map((d) => <option key={d} value={d} />)}</datalist>
      <FieldError state={state} name="department" />
    </div>
  );
}
