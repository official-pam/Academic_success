'use client';
// Check-ins made without a connection wait here until they can be sent.
// Each item carries the id the server will store, so a retry after a lost response can't
// create a duplicate, and (user_id, day) is unique on the server as a second guard.
const KEY = 'tlv.pending-checkins';

export function readQueue() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items.filter((item) => item && typeof item.id === 'string' && typeof item.user_id === 'string' && typeof item.day === 'string') : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('tlv:queue'));
}

export function enqueue(item) {
  const items = readQueue().filter((i) => !(i.user_id === item.user_id && i.day === item.day));
  writeQueue([...items, { ...item, queued_at: new Date().toISOString() }]);
}

export function updateQueued(id, patch) {
  writeQueue(readQueue().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function pendingFor(userId) {
  return readQueue().filter((i) => i.user_id === userId);
}

const isNetworkError = (error) =>
  !error?.code && /fetch|network|load failed|timed out/i.test(error?.message || '');

/** Sends one check-in. Returns 'saved' | 'exists' | 'offline' | { error }. */
export async function sendCheckin(supabase, item) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  try {
    const { error } = await supabase.from('checkins').insert({ id: item.id, user_id: item.user_id, day: item.day, minutes: item.minutes ?? null, note: item.note || null });
    if (!error) return 'saved';
    if (error.code === '23505') return 'exists';
    if (error.status >= 500 || ['401', '403', '42501', 'PGRST301', 'PGRST302'].includes(String(error.code)) || /jwt|token|session/i.test(error.message || '')) return 'offline';
    if (isNetworkError(error)) return 'offline';
    return { error };
  } catch (e) {
    return isNetworkError(e) || e instanceof TypeError ? 'offline' : { error: e };
  }
}

const syncs = new Map();
/** Flushes this user's queue. Returns { synced, failed } where failed items are dropped with a reason. */
export function syncQueue(supabase, userId) {
  if (syncs.has(userId)) return syncs.get(userId);
  const syncing = (async () => {
    let synced = 0;
    const failed = [];
    for (const item of pendingFor(userId)) {
      const result = await sendCheckin(supabase, item);
      if (result === 'offline') break;
      writeQueue(readQueue().filter((i) => i.id !== item.id));
      if (result === 'saved' || result === 'exists') synced += 1;
      else failed.push({ item, message: result.error?.message || 'Rejected by the server' });
    }
    return { synced, failed };
  })().finally(() => {
    syncs.delete(userId);
  });
  syncs.set(userId, syncing);
  return syncing;
}
