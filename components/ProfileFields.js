'use client';
import { useMemo, useState } from 'react';
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
            <span className="num flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-stone bg-surface text-sm font-semibold peer-checked:border-lavender-strong peer-checked:bg-lavender-strong peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ink">
              {l}L
            </span>
          </label>
        ))}
      </div>
      <FieldError state={state} name={name} />
    </fieldset>
  );
}

/*
  School, then programme (department), both chosen from the FUT Minna catalogue, so nobody types them.
  The programme list only shows the chosen school's programmes.
*/
export function SchoolProgrammePicker({ state, schools, programmes, defaultSchool, defaultProgramme }) {
  const [school, setSchool] = useState(defaultSchool || '');
  const [programme, setProgramme] = useState(defaultProgramme ? String(defaultProgramme) : '');
  const options = useMemo(() => programmes.filter((p) => p.school_code === school), [programmes, school]);
  return (
    <div className="grid gap-5">
      <div className="field">
        <label htmlFor="school_code" className="label">School</label>
        <select
          id="school_code"
          name="school_code"
          className="input"
          value={school}
          onChange={(e) => { setSchool(e.target.value); setProgramme(''); }}
          {...invalid(state, 'school_code')}
        >
          <option value="" disabled>Choose your school</option>
          {schools.map((s) => (
            <option key={s.code} value={s.code}>{s.code} · {s.name.replace(/\s*\(.*\)$/, '')}</option>
          ))}
        </select>
        <FieldError state={state} name="school_code" />
      </div>
      <div className="field">
        <label htmlFor="programme_id" className="label">Department / programme</label>
        <select
          id="programme_id"
          name="programme_id"
          className="input"
          value={programme}
          onChange={(e) => setProgramme(e.target.value)}
          disabled={!school}
          {...invalid(state, 'programme_id')}
        >
          <option value="" disabled>{school ? 'Choose your programme' : 'Choose your school first'}</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <FieldError state={state} name="programme_id" />
      </div>
    </div>
  );
}
