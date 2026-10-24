import Link from 'next/link';
import { requireChairman } from '@/lib/auth';
import { levelLabel, LEVELS } from '@/lib/constants';
import { RoleForm } from './RoleForm';

export const metadata = { title: 'People and roles' };
const PAGE = 30;

export default async function PeoplePage({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || '').trim().slice(0, 60);
  const level = LEVELS.includes(Number(sp.level)) ? Number(sp.level) : null;
  const page = Math.max(Number(sp.page) || 1, 1);
  const { supabase } = await requireChairman();

  let query = supabase.from('profiles').select('id, full_name, level, department, role, coordinator_level, onboarded_at', { count: 'exact' })
    .order('role', { ascending: false }).order('full_name').range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike('full_name', `%${q.replace(/[%_]/g, '')}%`);
  if (level) query = query.eq('level', level);
  const [{ data: people, count, error }, { data: staff }] = await Promise.all([
    query,
    supabase.from('profiles').select('full_name, role, coordinator_level').neq('role', 'member').order('coordinator_level', { nullsFirst: true }),
  ]);
  const pages = Math.max(Math.ceil((count || 0) / PAGE), 1);
  const qs = (p) => `/admin/people?${new URLSearchParams({ ...(q && { q }), ...(level && { level: String(level) }), page: String(p) })}`;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="display text-[2.25rem] leading-[1.08]">People and roles</h1>
        <p className="mt-1 text-sm text-muted">Appoint level coordinators and hand over the chairman role. Members see only names here; no records.</p>
      </div>

      <section aria-labelledby="committee" className="panel p-4">
        <h2 id="committee" className="text-sm font-semibold text-muted">Committee</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {LEVELS.map((l) => {
            const c = (staff || []).filter((s) => s.role === 'coordinator' && s.coordinator_level === l);
            return <li key={l}><strong>{l}L:</strong> {c.length ? c.map((x) => x.full_name).join(', ') : <span className="text-notice-ink">no coordinator yet</span>}</li>;
          })}
          <li><strong>Chairman:</strong> {(staff || []).filter((s) => s.role === 'chairman').map((x) => x.full_name).join(', ')}</li>
        </ul>
      </section>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="field">
          <label htmlFor="q" className="label">Search by name</label>
          <input id="q" name="q" defaultValue={q} className="input w-64 max-w-full" />
        </div>
        <div className="field">
          <label htmlFor="lv" className="label">Level</label>
          <select id="lv" name="level" defaultValue={level || ''} className="input w-32">
            <option value="">All</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
          </select>
        </div>
        <button className="btn btn-primary">Search</button>
      </form>

      {error ? <p role="alert">Couldn't load people.</p> : (
        <section aria-label="Members">
          <p className="num text-sm text-muted">{count ?? 0} {count === 1 ? 'person' : 'people'}</p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {(people || []).map((p) => (
              <li key={p.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{p.full_name || 'No name yet'}</p>
                  <p className="text-sm text-muted">{p.onboarded_at ? `${levelLabel(p.level)} · ${p.department}` : 'Has not finished setting up'}</p>
                </div>
                <RoleForm person={p} />
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
