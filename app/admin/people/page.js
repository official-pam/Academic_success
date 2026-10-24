import Link from 'next/link';
import { requireChairman } from '@/lib/auth';
import { levelLabel, LEVELS, ROLE_LABEL } from '@/lib/constants';
import { getDirectory } from '@/lib/catalogue';
import { RoleForm } from './RoleForm';

export const metadata = { title: 'People and roles' };
const PAGE = 30;

export default async function PeoplePage({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || '').trim().slice(0, 60);
  const level = LEVELS.includes(Number(sp.level)) ? Number(sp.level) : null;
  const school = /^[A-Za-z]{2,6}$/.test(sp.school || '') ? sp.school : null;
  const role = ['member', 'coordinator', 'chairman'].includes(sp.role) ? sp.role : null;
  const page = Math.max(Number(sp.page) || 1, 1);
  const { supabase, user } = await requireChairman();
  const { schools } = await getDirectory(supabase);

  let query = supabase.from('profiles')
    .select('id, full_name, level, department, school_code, role, coordinator_level, committee_school, onboarded_at', { count: 'exact' })
    .order('role', { ascending: false }).order('full_name').range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike('full_name', `%${q.replace(/[%_]/g, '')}%`);
  if (level) query = query.eq('level', level);
  if (school) query = query.eq('school_code', school);
  if (role) query = query.eq('role', role);
  const [{ data: people, count, error }, { data: staff }] = await Promise.all([
    query,
    supabase.from('profiles').select('full_name, role, coordinator_level, committee_school').neq('role', 'member').order('committee_school', { nullsFirst: true }),
  ]);
  const pages = Math.max(Math.ceil((count || 0) / PAGE), 1);
  const qs = (p) => `/admin/people?${new URLSearchParams({ ...(q && { q }), ...(level && { level: String(level) }), ...(school && { school }), ...(role && { role }), page: String(p) })}`;
  const admins = (staff || []).filter((s) => s.role === 'chairman');
  const heads = (staff || []).filter((s) => s.role === 'coordinator');
  const headSchools = [...new Set(heads.map((h) => h.committee_school || 'No school'))];

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="display text-[2.25rem] leading-[1.08]">People and roles</h1>
        <p className="mt-1 text-sm text-muted">
          Make anyone a member, a committee head for a school, or an admin. Committee heads mentor the students in
          their school (and level, if you set one) and can see their courses, results and study sessions.
        </p>
      </div>

      <section aria-labelledby="committee" className="panel grid gap-3 p-5">
        <h2 id="committee" className="text-sm font-semibold text-muted">Committee</h2>
        <p className="text-sm"><strong>Admin:</strong> {admins.map((x) => x.full_name).join(', ') || '—'}</p>
        {headSchools.length ? (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {headSchools.map((sc) => (
              <li key={sc}><strong>{sc}:</strong> {heads.filter((h) => (h.committee_school || 'No school') === sc).map((h) => `${h.full_name}${h.coordinator_level ? ` (${h.coordinator_level}L)` : ''}`).join(', ')}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-notice-ink">No committee heads yet. Find someone below and set their role to Committee head.</p>
        )}
      </section>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="field">
          <label htmlFor="q" className="label">Search by name</label>
          <input id="q" name="q" defaultValue={q} className="input w-56 max-w-full" />
        </div>
        <div className="field">
          <label htmlFor="sc" className="label">School</label>
          <select id="sc" name="school" defaultValue={school || ''} className="input w-32">
            <option value="">All</option>
            {schools.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lv" className="label">Level</label>
          <select id="lv" name="level" defaultValue={level || ''} className="input w-28">
            <option value="">All</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rl" className="label">Role</label>
          <select id="rl" name="role" defaultValue={role || ''} className="input w-40">
            <option value="">Everyone</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn btn-primary">Search</button>
      </form>

      {error ? <p role="alert" className="notice">Couldn't load people. Try again.</p> : (
        <section aria-label="People">
          <p className="num text-sm text-muted">{count ?? 0} {count === 1 ? 'person' : 'people'}</p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {(people || []).map((p) => (
              <li key={p.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="font-semibold">
                    {p.full_name || 'No name yet'}{' '}
                    <span className="chip ml-1 bg-lavender-wash text-lavender-ink">{ROLE_LABEL[p.role]}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {p.onboarded_at ? [p.school_code, levelLabel(p.level), p.department].filter(Boolean).join(' · ') : 'Has not finished setting up'}
                  </p>
                  {p.role !== 'chairman' && (
                    <Link href={`/admin/students/${p.id}`} className="text-sm font-semibold text-lavender-ink underline-offset-4 hover:underline">View progress</Link>
                  )}
                </div>
                <RoleForm person={p} schools={schools} isSelf={p.id === user.id} />
              </li>
            ))}
            {!people?.length && <li className="py-3 text-sm text-muted">No one matches.</li>}
          </ul>
          {pages > 1 && (
            <div className="mt-4 flex items-center gap-3 text-sm">
              {page > 1 && <Link className="btn btn-outline" href={qs(page - 1)}>Previous</Link>}
              <span className="num">Page {page} of {pages}</span>
              {page < pages && <Link className="btn btn-outline" href={qs(page + 1)}>Next</Link>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
