'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { saveTarget, saveResult, removeEnrolment } from './actions';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { RefreshingForm } from '@/components/RefreshingForm';
import { SubmitButton } from '@/components/forms';
import { GRADES, GRADE_RANGE, POINTS, gradeForScore } from '@/lib/grades';

const GRADE_TONE = { A: 'bg-sage-wash text-sage-ink', B: 'bg-sage-wash text-sage-ink', C: 'bg-slate-wash text-slate-ink', D: 'bg-rose-wash text-rose-ink', E: 'bg-rose-wash text-rose-ink', F: 'bg-danger-wash text-danger' };

export function GradeChip({ grade, label }) {
  if (!grade) return null;
  return <span className={`chip ${GRADE_TONE[grade]}`}>{label ? `${label} ` : ''}{grade}</span>;
}

/** One enrolled course: target grade + goal (point 9) and the result once it's out (point 8). */
export function EnrolmentCard({ e, focusMinutes = 0 }) {
  const [targetState, targetAction] = useActionState(saveTarget, null);
  const [resultState, resultAction] = useActionState(saveResult, null);
  useRefreshOnSuccess(targetState);
  useRefreshOnSuccess(resultState);
  const [score, setScore] = useState(e.score ?? '');
  const preview = score !== '' ? gradeForScore(score) : null;
  const met = e.grade && e.target_grade ? POINTS[e.grade] >= POINTS[e.target_grade] : null;

  return (
    <li className="panel grid gap-4 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{e.course_code}</p>
          <p className="text-sm">{e.course_title}</p>
          <p className="mt-1 text-xs text-muted">
            <span className="num">{e.credit_units}</span> units{focusMinutes ? <> · <span className="num">{focusMinutes}</span> min focused</> : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {e.grade ? <GradeChip grade={e.grade} label="Result" /> : <span className="chip bg-paper text-muted">No result yet</span>}
          {e.target_grade && <span className="text-xs text-muted">Target {e.target_grade}</span>}
        </div>
      </div>
      {met !== null && (
        <p className={`text-sm ${met ? 'text-sage-ink' : 'text-rose-ink'}`}>
          {met ? 'You reached your target. Well done.' : `Below your target of ${e.target_grade}. Talk to your committee head about what would help.`}
        </p>
      )}

      <form action={targetAction} className="grid gap-2">
        <input type="hidden" name="id" value={e.id} />
        <div className="grid grid-cols-[6.5rem_1fr] gap-2">
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Target grade
            <select name="target_grade" defaultValue={e.target_grade || ''} className="input min-h-11 text-ink">
              <option value="">—</option>
              {GRADES.filter((g) => g !== 'E').map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            My realistic goal
            <input name="goal" defaultValue={e.goal || ''} maxLength={300} className="input min-h-11 text-ink" placeholder="e.g. Solve 10 past questions each week" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton className="btn btn-soft min-h-10 px-4" pendingLabel="Saving…">Save target</SubmitButton>
          {targetState?.message && <span role={targetState.ok ? 'status' : 'alert'} className={`text-xs ${targetState.ok ? 'text-sage-ink' : 'text-danger'}`}>{targetState.message}</span>}
        </div>
      </form>

      <details className="rounded-[var(--radius-control)] bg-paper px-3 py-2" open={Boolean(e.grade)}>
        <summary className="cursor-pointer py-1 text-sm font-semibold">{e.grade ? 'Edit result' : 'Enter result'}</summary>
        <form action={resultAction} className="mt-2 grid gap-2">
          <input type="hidden" name="id" value={e.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Score (0–100)
              <input name="score" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={score} onChange={(ev) => setScore(ev.target.value)} className="input num min-h-11 text-ink" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Or grade only
              <select name="grade" defaultValue={e.score === null ? e.grade || '' : ''} disabled={score !== ''} className="input min-h-11 text-ink">
                <option value="">—</option>
                {GRADES.map((g) => <option key={g} value={g}>{g} ({GRADE_RANGE[g]})</option>)}
              </select>
            </label>
          </div>
          {preview && <p className="text-xs text-muted">That score is a <strong className="text-ink">{preview}</strong> ({POINTS[preview]} points).</p>}
          <div className="flex items-center gap-3">
            <SubmitButton className="btn btn-primary min-h-10 px-4" pendingLabel="Saving…">Save result</SubmitButton>
            {resultState?.message && <span role={resultState.ok ? 'status' : 'alert'} className={`text-xs ${resultState.ok ? 'text-sage-ink' : 'text-danger'}`}>{resultState.message}</span>}
          </div>
        </form>
      </details>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={`/focus?enrolment=${e.id}`} className="btn btn-accent min-h-10 px-4">Start focus timer</Link>
        <RefreshingForm action={removeEnrolment}>
          <input type="hidden" name="id" value={e.id} />
          <button className="min-h-10 text-sm font-medium text-muted underline-offset-4 hover:underline" aria-label={`Remove ${e.course_code}`}>Remove</button>
        </RefreshingForm>
      </div>
    </li>
  );
}
