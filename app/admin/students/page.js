import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { LEVELS, levelLabel, roleLine } from '@/lib/constants';
import { getDirectory } from '@/lib/catalogue';
import { currentSession, currentSemester, fmtGpa } from '@/lib/grades';
import { summarise } from '@/lib/students';

export const metadata = { title: 'Students' };
const PAGE = 30;

export default async function StudentsPage({ searchParams }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff();
  const admin = profile.role === 'chairman';
  const q = String(sp.q || '').trim().slice(0, 60);
  const level = LEVELS.includes(Number(sp.level)) ? Number(sp.level) : null;
  const school = admin && /^[A-Za-z]{2,6}$/.test(sp.school || '') ? sp.school : null;
  const page = Math.max(Number(sp.page) || 1, 1);
  const term = { session: currentSession(), semester: currentSemester() };
  const { schools } = admin ? await getDirectory(supabase) : { schools: [] };

  // RLS decides who appears: the admin sees everyone, a committee head sees their school (and level).
  let query = supabase.from('profiles')
    .select('id, full_name, level, school_code, department, prior_cgpa, prior_units', { count: 'exact' })
    .not('onboarded_at', 'is', null).neq('id', profile.id)
    .order('school_code', { nullsFirst: false }).order('level').order('full_name')
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike('full_name', `%${q.replace(/[%_]/g, '')}%`);
  if (level) query = query.eq('level', level);
  if (school) query = query.eq('school_code', school);
  const { data: people, count, error } = await query;
  const stats = await summarise(supabase, people || [], term);
  const pages = Math.max(Math.ceil((count || 0) / PAGE), 1);
  const qs = (p) => `/admin/students?${new URLSearchParams({ ...(q && { q }), ...(level && { level: String(level) }), ...(school && { school }), page: String(p) })}`;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-[2.25rem] leading-[1.08]">Students</h1>
        <p className="mt-1 text-sm text-muted">
          {admin ? 'Everyone in the app.' : `Students you mentor: ${roleLine(profile).replace('Committee head · ', '')}.`}{' '}
          Study time and check-ins are for the last 7 days; courses are for {term.session}, {term.semester === 1 ? 'first' : 'second'} semester.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="field">
          <label htmlFor="q" className="label">Search by name</label>
          <input id="q" name="q" defaultValue={q} className="input w-56 max-w-full" />
        </div>
        {admin && (
          <div className="field">
            <label htmlFor="sc" className="label">School</label>
            <select id="sc" name="school" defaultValue={school || ''} className="input w-32">
              <option value="">All</option>
              {schools.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="lv" className="label">Level</label>
          <select id="lv" name="level" defaultValue={level || ''} className="input w-28">
            <option value="">All</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
          </select>
        </div>
        <button className="btn btn-primary">Filter</button>
      </form>

      {error ? <p role="alert" className="notice">Couldn't load students. Try again.</p> : (
        <section aria-label="Students" className="panel overflow-x-auto p-1">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Student</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Focus (7 days)</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Check-ins</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Courses</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">CGPA</th>
              </tr>
            </thead>
            <tbody className="num">
              {(people || []).map((p) => {
                const s = stats[p.id];
                return (
                  <tr key={p.id} className="border-t border-rule">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/admin/students/${p.id}`} className="font-semibold text-ink underline-offset-4 hover:underline">{p.full_name}</Link>
                      <span className="block text-xs text-muted">{[p.school_code || 'No school yet', levelLabel(p.level), p.department].filter(Boolean).join(' · ')}</span>
                    </th>
                    <td className="px-3 py-3 text-right">{s.minutes} min<span className="block text-xs text-muted">{s.sessions} {s.sessions === 1 ? 'session' : 'sessions'}</span></td>
                    <td className="px-3 py-3 text-right">{s.days} / 7</td>
                    <td className="px-3 py-3 text-right">{s.courses}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtGpa(s.cgpa)}</td>
                  </tr>
                );
              })}
              {!people?.length && (
                <tr><td colSpan={5} className="px-4 py-4 text-sm text-muted">
                  {admin ? 'No students match.' : 'No students in your school yet. They appear once they set their school in Profile.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-outline" href={qs(page - 1)}>Previous</Link>}
          <span className="num">Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-outline" href={qs(page + 1)}>Next</Link>}
        </div>
      )}
    </div>
  );
}
