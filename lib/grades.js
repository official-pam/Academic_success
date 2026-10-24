// FUT Minna grading (NUC CCMAS, current): A 70-100 = 5, B 60-69 = 4, C 50-59 = 3, D 45-49 = 2, F 0-44 = 0.
// E (40-44 = 1) is accepted for results recorded under the older scale.
// Keep in step with public.grade_for_score() in supabase/migrations/004_schools_courses_mentors.sql.
export const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];
export const POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
export const GRADE_RANGE = { A: '70–100', B: '60–69', C: '50–59', D: '45–49', E: '40–44 (old scale)', F: '0–44' };

export function gradeForScore(score) {
  if (score === null || score === undefined || score === '' || Number.isNaN(Number(score))) return null;
  const s = Number(score);
  if (s >= 70) return 'A';
  if (s >= 60) return 'B';
  if (s >= 50) return 'C';
  if (s >= 45) return 'D';
  return 'F';
}

/** GPA over rows with { credit_units, grade }. Ignores rows without a grade or with 0 units. */
export function gpa(rows, gradeKey = 'grade') {
  let units = 0, points = 0;
  for (const r of rows) {
    const g = r[gradeKey];
    const u = Number(r.credit_units) || 0;
    if (!g || !(g in POINTS) || u <= 0) continue;
    units += u;
    points += u * POINTS[g];
  }
  return { units, points, value: units ? points / units : null };
}

/** CGPA across all graded rows plus an optional starting CGPA from before the member used the app. */
export function cgpa(rows, prior) {
  const g = gpa(rows);
  const pu = Number(prior?.prior_units) || 0;
  const pc = prior?.prior_cgpa === null || prior?.prior_cgpa === undefined ? null : Number(prior.prior_cgpa);
  const units = g.units + (pc !== null ? pu : 0);
  const points = g.points + (pc !== null ? pc * pu : 0);
  return { units, value: units ? points / units : null };
}

export const fmtGpa = (v) => (v === null || v === undefined ? '—' : (Math.round(v * 100) / 100).toFixed(2));

export function classOfDegree(v) {
  if (v === null || v === undefined) return null;
  if (v >= 4.5) return 'First class';
  if (v >= 3.5) return 'Second class upper';
  if (v >= 2.4) return 'Second class lower';
  if (v >= 1.5) return 'Third class';
  if (v >= 1.0) return 'Pass';
  return 'Below a pass';
}

export function distribution(rows) {
  const d = Object.fromEntries(GRADES.map((g) => [g, 0]));
  for (const r of rows) if (r.grade && r.grade in d) d[r.grade] += 1;
  return d;
}

/** FUT Minna academic session for a date: a session starts in September ("2026/2027"). */
export function currentSession(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Rough default: first semester runs September to February. */
export function currentSemester(now = new Date()) {
  const m = now.getUTCMonth() + 1;
  return m >= 9 || m <= 2 ? 1 : 2;
}

export function recentSessions(now = new Date(), count = 6) {
  const start = Number(currentSession(now).slice(0, 4));
  return Array.from({ length: count }, (_, i) => `${start - i}/${start - i + 1}`);
}
