import { getViewer, isStaff } from '@/lib/auth';
import { MIN_GROUP } from '@/lib/constants';

// Semester summary as CSV: weekly totals per level, no names, no notes.
export async function GET(request) {
  const { supabase, profile } = await getViewer();
  if (!isStaff(profile)) return new Response('Not allowed', { status: 403 });
  const weeks = Math.min(Math.max(Number(new URL(request.url).searchParams.get('weeks')) || 16, 1), 26);
  const { data, error } = await supabase.rpc('participation_weekly', { p_weeks: weeks });
  if (error) return new Response('Could not build the export', { status: 500 });
  const lines = [['week_start', 'level', 'members', 'members_who_read', 'share_percent', 'checkins'].join(',')];
  for (const r of [...data].sort((a, b) => a.week_start.localeCompare(b.week_start) || a.level - b.level)) {
    const m = Number(r.members), a = Number(r.active_members);
    const show = m >= MIN_GROUP; // small groups: counts suppressed so no individual is identifiable
    lines.push([r.week_start, `${r.level}L`, m, show ? a : '', show ? Math.round((a / m) * 100) : '', show ? Number(r.checkins) : ''].join(','));
  }
  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tlv-participation-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
