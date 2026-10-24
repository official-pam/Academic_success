import 'server-only';
import { isDay, isTime } from '@/lib/validation';
import { LEVELS } from '@/lib/constants';

/** Date + time typed in Lagos -> ISO timestamp. */
export function lagosToISO(date, time) {
  if (!isDay(date)) return null;
  if (time && !isTime(time)) return null;
  const t = time || '23:59';
  const d = new Date(`${date}T${t}:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Committee heads are pinned to their level when they have one; otherwise any level or all. */
export function resolveLevel(profile, raw) {
  if (profile.role === 'coordinator' && profile.coordinator_level) return profile.coordinator_level;
  if (raw === '' || raw === 'all' || raw == null) return null;
  const n = Number(raw);
  return LEVELS.includes(n) ? n : undefined;
}

/** Committee heads are pinned to their school; the admin may pick a school or all (null). */
export function resolveSchool(profile, raw) {
  if (profile.role === 'coordinator' && profile.committee_school) return profile.committee_school;
  if (raw === '' || raw === 'all' || raw == null) return null;
  return /^[A-Za-z]{2,6}$/.test(String(raw)) ? String(raw) : undefined;
}

export function dbErrorMessage(error) {
  if (!error) return null;
  if (error.code === '42501' || /row-level security/i.test(error.message)) return 'You don\'t have permission to publish for that audience.';
  if (/deadline must be in the future/i.test(error.message)) return 'The deadline must be in the future.';
  if (error.code === '23514') return 'Some details are too long or invalid. Check the fields and try again.';
  return 'Couldn\'t save. Check your connection and try again.';
}

export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
