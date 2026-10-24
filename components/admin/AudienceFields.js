'use client';
import { FieldError, invalid } from '@/components/forms';
import { LEVELS, levelLabel } from '@/lib/constants';

/*
  Who a post is for: a school (or every school) and a level (or every level).
  Committee heads are pinned to their own school, and to their level if they have one;
  the database enforces the same rule (can_admin_scope).
*/
export function AudienceFields({ profile, schools, state, value, onChange }) {
  const head = profile.role === 'coordinator';
  const fixedSchool = head ? profile.committee_school : null;
  const fixedLevel = head ? profile.coordinator_level : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="field">
        <label htmlFor="school_code" className="label">School</label>
        {fixedSchool ? (
          <>
            <input type="hidden" name="school_code" value={fixedSchool} />
            <p id="school_code" className="input flex items-center bg-paper">{fixedSchool}</p>
          </>
        ) : (
          <select id="school_code" name="school_code" value={value.school_code} onChange={(e) => onChange('school_code', e.target.value)} className="input" {...invalid(state, 'school_code')}>
            <option value="all">All schools</option>
            {schools.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.name.replace(/\s*\(.*\)$/, '')}</option>)}
          </select>
        )}
        <FieldError state={state} name="school_code" />
      </div>
      <div className="field">
        <label htmlFor="level" className="label">Level</label>
        {fixedLevel ? (
          <>
            <input type="hidden" name="level" value={fixedLevel} />
            <p id="level" className="input flex items-center bg-paper">{levelLabel(fixedLevel)}</p>
          </>
        ) : (
          <select id="level" name="level" value={value.level} onChange={(e) => onChange('level', e.target.value)} className="input" {...invalid(state, 'level')}>
            <option value="all">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
          </select>
        )}
        <FieldError state={state} name="level" />
      </div>
      {head && <p className="hint sm:col-span-2">As a committee head you post to {fixedSchool || 'your school'}{fixedLevel ? `, ${fixedLevel}L` : ''}.</p>}
    </div>
  );
}

export function audienceText({ school_code, level, department }) {
  const school = !school_code || school_code === 'all' ? 'All schools' : school_code;
  const lv = !level || level === 'all' ? 'all levels' : levelLabel(Number(level));
  return `${school} · ${lv}${department !== undefined ? (department ? ` · ${department}` : ' · all departments') : ''}`;
}
