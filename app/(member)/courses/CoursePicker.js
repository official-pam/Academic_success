'use client';
import { useActionState, useEffect, useId, useMemo, useRef, useState } from 'react';
import { enrolCourse } from './actions';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';

/*
  Course dropdown with suggestions as you type (point 2). Lists the member's programme catalogue,
  with this level and semester first. Arrow keys move, Enter picks, Escape closes.
  If a course isn't in the catalogue yet, "Add it by hand" opens three small fields.
*/
export function CoursePicker({ courses, enrolledCodes, session, semester, level }) {
  const [state, action] = useActionState(enrolCourse, null);
  useRefreshOnSuccess(state);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);
  const listId = useId();
  const inputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.reset) { setQuery(''); setPicked(null); setManual(false); formRef.current?.reset(); }
    if (state?.manual) setManual(true);
  }, [state]);

  const taken = useMemo(() => new Set(enrolledCodes), [enrolledCodes]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
    const scored = courses
      .filter((c) => !taken.has(c.code))
      .filter((c) => !q || c.code.toLowerCase().replace(/\s+/g, ' ').includes(q) || c.code.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s/g, '')) || c.title.toLowerCase().includes(q))
      .map((c) => ({ c, rank: (c.level === level ? 0 : 2) + (c.semester === semester ? 0 : 1) }));
    scored.sort((a, b) => a.rank - b.rank || a.c.code.localeCompare(b.c.code));
    return scored.slice(0, 12).map((x) => x.c);
  }, [courses, taken, query, level, semester]);

  function choose(c) {
    setPicked(c);
    setQuery(`${c.code} · ${c.title}`);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <form ref={formRef} action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="semester" value={semester} />
      {!manual ? (
        <>
          <input type="hidden" name="course_id" value={picked?.id || ''} />
          <div className="field relative">
            <label htmlFor="course-search" className="label">Add a course</label>
            <input
              id="course-search"
              ref={inputRef}
              className="input"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
              autoComplete="off"
              placeholder={courses.length ? 'Type a code or title, e.g. EEE 301' : 'Your programme\'s list isn\'t loaded yet'}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPicked(null); setOpen(true); setActive(0); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKeyDown}
            />
            {open && matches.length > 0 && (
              <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-[var(--radius-control)] border border-rule bg-surface py-1 shadow-[var(--shadow-soft)]">
                {matches.map((c, i) => (
                  <li
                    key={c.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => { e.preventDefault(); choose(c); }}
                    onMouseEnter={() => setActive(i)}
                    className={`cursor-pointer px-4 py-2.5 ${i === active ? 'bg-lavender-wash' : ''}`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold">{c.code} <span className="font-normal">· {c.title}</span></span>
                      <span className="num shrink-0 text-xs text-muted">{c.credit_units ?? '—'} units</span>
                    </span>
                    <span className="block text-xs text-muted">
                      {c.level}L · {c.semester === 1 ? 'First' : c.semester === 2 ? 'Second' : 'Any'} semester{c.status ? ` · ${c.status}` : ''}
                      {c.level === level && c.semester === semester ? ' · matches this semester' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {open && query && matches.length === 0 && (
              <p className="mt-1 text-sm text-muted">No course matches “{query}”. You can add it by hand.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton className="btn btn-accent" pendingLabel="Adding…" disabled={!picked}>Add course</SubmitButton>
            <button type="button" className="btn-quiet text-sm font-semibold text-lavender-ink" onClick={() => setManual(true)}>Not in the list? Add it by hand</button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div className="field">
              <label htmlFor="course_code" className="label">Course code</label>
              <input id="course_code" name="course_code" className="input uppercase" placeholder="GST 311" autoComplete="off" {...invalid(state, 'course_code')} />
              <FieldError state={state} name="course_code" />
            </div>
            <div className="field">
              <label htmlFor="credit_units" className="label">Units</label>
              <input id="credit_units" name="credit_units" type="number" inputMode="numeric" min="0" max="15" className="input num" {...invalid(state, 'credit_units')} />
              <FieldError state={state} name="credit_units" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="course_title" className="label">Course title</label>
            <input id="course_title" name="course_title" className="input" {...invalid(state, 'course_title')} />
            <FieldError state={state} name="course_title" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton className="btn btn-accent" pendingLabel="Adding…">Add course</SubmitButton>
            <button type="button" className="btn-quiet text-sm font-semibold text-lavender-ink" onClick={() => setManual(false)}>Back to the list</button>
          </div>
        </>
      )}
      <FormMessage state={state} />
    </form>
  );
}
