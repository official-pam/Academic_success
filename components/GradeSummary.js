import { GRADES, POINTS, distribution, fmtGpa, classOfDegree } from '@/lib/grades';

// Grade colours follow the app palette: strong grades sage, middle slate, weak rose, fail danger.
const BAR = { A: 'bg-sage-strong', B: 'bg-sage', C: 'bg-slate', D: 'bg-rose', E: 'bg-rose', F: 'bg-danger' };

/**
  GPA for the semester, target GPA, CGPA and the grade distribution (point 8).
  Server-safe: no client code. Also used on a mentor's student page.
*/
export function GradeSummary({ semesterGpa, targetGpa, cgpaValue, cgpaUnits, rows, title = 'Your results' }) {
  const dist = distribution(rows);
  const graded = Object.values(dist).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(dist));
  const cls = classOfDegree(cgpaValue);
  return (
    <section aria-labelledby="results-heading" className="panel grid gap-5 p-5">
      <h2 id="results-heading" className="text-base font-bold">{title}</h2>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-control)] bg-lavender-wash p-3">
          <dt className="text-xs font-semibold text-lavender-ink">Semester</dt>
          <dd className="num display mt-1 text-[1.75rem] leading-none">{fmtGpa(semesterGpa)}</dd>
          <dd className="mt-1 text-xs text-muted">GPA</dd>
        </div>
        <div className="rounded-[var(--radius-control)] bg-sage-wash p-3">
          <dt className="text-xs font-semibold text-sage-ink">Target</dt>
          <dd className="num display mt-1 text-[1.75rem] leading-none">{fmtGpa(targetGpa)}</dd>
          <dd className="mt-1 text-xs text-muted">GPA</dd>
        </div>
        <div className="rounded-[var(--radius-control)] bg-slate-wash p-3">
          <dt className="text-xs font-semibold text-slate-ink">CGPA</dt>
          <dd className="num display mt-1 text-[1.75rem] leading-none">{fmtGpa(cgpaValue)}</dd>
          <dd className="mt-1 text-xs text-muted">{cls ? cls : cgpaUnits ? `${cgpaUnits} units` : 'no results yet'}</dd>
        </div>
      </dl>

      <figure className="m-0 grid gap-2">
        <figcaption className="text-sm font-semibold">
          Grade distribution <span className="font-normal text-muted">· {graded} {graded === 1 ? 'result' : 'results'} recorded</span>
        </figcaption>
        {graded === 0 ? (
          <p className="rounded-[var(--radius-control)] border border-dashed border-stone px-3 py-3 text-sm text-muted">
            Enter a result on any course and your distribution appears here.
          </p>
        ) : (
          <ul className="grid gap-1.5">
            {GRADES.filter((g) => g !== 'E' || dist.E > 0).map((g) => (
              <li key={g} className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-2 text-sm">
                <span className="font-bold">{g}</span>
                <span className="bar h-3" aria-hidden="true"><span className={BAR[g]} style={{ width: `${(dist[g] / max) * 100}%` }} /></span>
                <span className="num text-right">{dist[g]}</span>
                <span className="sr-only">{dist[g]} {g} {dist[g] === 1 ? 'grade' : 'grades'} ({POINTS[g]} points each)</span>
              </li>
            ))}
          </ul>
        )}
      </figure>
    </section>
  );
}
