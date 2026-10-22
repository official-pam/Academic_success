import 'server-only';
import { LEVELS } from '@/lib/constants';

/** Date + time typed in Lagos -> ISO timestamp. */
export function lagosToISO(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const t = /^\d{2}:\d{2}$/.test(time || '') ? time : '23:59';
  const d = new Date(`${date}T${t}:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Coordinators are pinned to their level; the chairman may choose any level or all. */
export function resolveLevel(profile, raw) {
  if (profile.role === 'coordinator') return profile.coordinator_level;
  if (raw === '' || raw === 'all' || raw == null) return null;
  const n = Number(raw);
  return LEVELS.includes(n) ? n : undefined;
}

export function dbErrorMessage(error) {
  if (!error) return null;
  if (error.code === '42501' || /row-level security/i.test(error.message)) return 'You don\'t have permission to publish for that audience.';
  if (/deadline must be in the future/i.test(error.message)) return 'The deadline must be in the future.';
  if (error.code === '23514') return 'Some details are too long or invalid. Check the fields and try again.';
  return 'Couldn\'t save. Check your connection and try again.';
}

export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
