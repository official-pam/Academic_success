import Link from 'next/link';
export function StatusTabs({ base, current, counts }) {
  const tabs = [['published', 'Published'], ['draft', 'Drafts'], ['archived', 'Archived']];
  return (
    <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto border-b border-rule">
      {tabs.map(([key, label]) => (
        <Link key={key} href={`${base}?status=${key}`} aria-current={current === key ? 'page' : undefined}
          className={`-mb-px flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm ${current === key ? 'border-ink font-bold' : 'border-transparent text-muted hover:text-ink'}`}>
          {label} {counts?.[key] != null && <span className="num font-medium text-muted">{counts[key]}</span>}
        </Link>
      ))}
    </nav>
  );
}

export async function statusCounts(supabase, table) {
  const res = await Promise.all(['published', 'draft', 'archived'].map((s) =>
    supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', s)));
  return { published: res[0].count ?? 0, draft: res[1].count ?? 0, archived: res[2].count ?? 0 };
}

export const parseStatus = (s) => (['published', 'draft', 'archived'].includes(s) ? s : 'published');
