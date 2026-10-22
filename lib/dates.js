// All "day" logic uses Lagos time so a check-in at 11:30 pm counts for the right day
// whatever timezone the server runs in.
export const TZ = 'Africa/Lagos';

export function lagosToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function parseDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toDay(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(day, n) {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
}

/** Monday of the week containing `day`. */
export function weekStart(day) {
  const dow = (parseDay(day).getUTCDay() + 6) % 7; // Mon=0
  return addDays(day, -dow);
}

export function weekDays(day) {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatDay(day, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(parseDay(day));
}

export function formatDateTime(iso, opts = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) {
  return new Intl.DateTimeFormat('en-GB', { hour12: true, ...opts, timeZone: TZ }).format(new Date(iso));
}

export function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(d);
}

/** Plain-language distance to a deadline: "today", "tomorrow", "in 3 days", "2 days ago". */
export function relativeDue(iso, now = new Date()) {
  const due = lagosToday(new Date(iso));
  const today = lagosToday(now);
  const diff = Math.round((parseDay(due) - parseDay(today)) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return diff > 1 ? `in ${diff} days` : `${-diff} days ago`;
}

export function greeting(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ }).format(now));
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Consecutive days ending today (or yesterday, so the streak isn't "lost" before you've read today). */
export function streak(days, today = lagosToday()) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Midnight Lagos time for a YYYY-MM-DD, as an ISO string (Lagos is UTC+1, no DST). */
export function lagosMidnightISO(day) {
  return new Date(`${day}T00:00:00+01:00`).toISOString();
}
