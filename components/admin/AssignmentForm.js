'use client';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { saveAssignment } from '@/app/admin/assignments/actions';
import { audienceCount } from '@/app/admin/actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';
import { RichText, ResourceList } from '@/components/RichText';
import { LEVELS, levelLabel } from '@/lib/constants';

export function AssignmentForm({ assignment, profile, today }) {
  const [state, action] = useActionState(saveAssignment, null);
  const clientKey = useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ''), []);
  const coordinator = profile.role === 'coordinator';
  const init = state?.values || {
    title: assignment?.title || '',
    instructions: assignment?.instructions || '',
    resources: assignment?.resources || '',
    due_date: assignment?.due_date || '',
    due_time: assignment?.due_time || '18:00',
    level: coordinator ? String(profile.coordinator_level) : assignment ? String(assignment.level ?? 'all') : 'all',
    department: assignment?.department || '',
  };
  const [v, setV] = useState(init);
  const [preview, setPreview] = useState(false);
  const [reach, setReach] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => audienceCount(v.level === 'all' ? null : v.level, v.department).then((n) => live && setReach(n)), 300);
    return () => { live = false; clearTimeout(t); };
  }, [v.level, v.department]);

  const audience = `${v.level === 'all' || !v.level ? 'All levels' : levelLabel(Number(v.level))}${v.department ? ` · ${v.department}` : ' · all departments'}`;
  const published = assignment?.status === 'published';

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
      <input type="hidden" name="id" value={assignment?.id || ''} />
      <input type="hidden" name="client_key" value={clientKey} />
      <div className="grid content-start gap-5">
        <div className="field">
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" value={v.title} onChange={set('title')} maxLength={140} className="input" placeholder="Read MTH 101 chapter 3 before Thursday's class" {...invalid(state, 'title')} />
          <FieldError state={state} name="title" />
        </div>
        <div className="field">
          <label htmlFor="instructions" className="label">Instructions</label>
          <textarea id="instructions" name="instructions" rows={6} value={v.instructions} onChange={set('instructions')} maxLength={4000} className="input" placeholder="What to read, how far, and anything to prepare." {...invalid(state, 'instructions')} />
          <FieldError state={state} name="instructions" />
        </div>
        <div className="field">
          <label htmlFor="resources" className="label">Resources <span className="font-normal text-muted">(one per line; links allowed)</span></label>
          <textarea id="resources" name="resources" rows={3} value={v.resources} onChange={set('resources')} maxLength={2000} className="input" placeholder={'Past questions 2023 – https://…\nLecture notes, week 4'} {...invalid(state, 'resources')} />
          <FieldError state={state} name="resources" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="due_date" className="label">Deadline date</label>
            <input id="due_date" name="due_date" type="date" min={today} value={v.due_date} onChange={set('due_date')} className="input" {...invalid(state, 'due_date')} />
            <FieldError state={state} name="due_date" />
          </div>
          <div className="field">
            <label htmlFor="due_time" className="label">Time</label>
            <input id="due_time" name="due_time" type="time" value={v.due_time} onChange={set('due_time')} className="input" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="level" className="label">Level</label>
            {coordinator ? (
              <>
                <input type="hidden" name="level" value={profile.coordinator_level} />
                <p id="level" className="input flex items-center bg-paper">{levelLabel(profile.coordinator_level)}</p>
                <p className="hint">Coordinators publish to their own level.</p>
              </>
            ) : (
              <select id="level" name="level" value={v.level} onChange={set('level')} className="input" {...invalid(state, 'level')}>
                <option value="all">All levels</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
              </select>
            )}
            <FieldError state={state} name="level" />
          </div>
          <div className="field">
            <label htmlFor="department" className="label">Department <span className="font-normal text-muted">(optional)</span></label>
            <input id="department" name="department" value={v.department} onChange={set('department')} placeholder="All departments" className="input" {...invalid(state, 'department')} />
            <FieldError state={state} name="department" />
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-6">
        <div className="panel grid gap-1 p-4 text-sm">
          <p className="text-muted">Audience</p>
          <p className="font-bold">{audience}</p>
          <p aria-live="polite">{reach === null ? 'Counting members…' : `Reaches ${reach} ${reach === 1 ? 'member' : 'members'} who have set up the app.`}</p>
          {reach === 0 && <p className="text-notice-ink">No one matches yet. Check the department spelling.</p>}
        </div>
        <button type="button" className="btn btn-outline" aria-expanded={preview} onClick={() => setPreview((p) => !p)}>
          {preview ? 'Hide preview' : 'Preview as a member'}
        </button>
        {preview && (
          <div className="panel grid gap-3 p-4" aria-label="Preview">
            <p className="text-lg font-bold">{v.title || 'Untitled assignment'}</p>
            <p className="text-sm text-muted">Due {v.due_date ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${v.due_date}T12:00:00Z`)) : '—'}{v.due_time ? `, ${v.due_time}` : ''} · {audience}</p>
            <RichText text={v.instructions} />
            <ResourceList text={v.resources} />
          </div>
        )}
        <FormMessage state={state} />
        <SubmitButton name="intent" value="publish" pendingLabel="Publishing…" className="btn btn-primary">
          {published ? 'Save and keep published' : 'Publish'}
        </SubmitButton>
        {!published && (
          <SubmitButton name="intent" value="draft" pendingLabel="Saving…" className="btn btn-outline">Save as draft</SubmitButton>
        )}
      </aside>
    </form>
  );
}
