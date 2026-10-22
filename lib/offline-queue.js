'use client';
// Check-ins made without a connection wait here until they can be sent.
// Each item carries the id the server will store, so a retry after a lost response can't
// create a duplicate, and (user_id, day) is unique on the server as a second guard.
const KEY = 'tlv.pending-checkins';

export function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
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
    const { error } = await supabase.from('checkins').insert({ id: item.id, day: item.day, minutes: item.minutes ?? null, note: item.note || null });
    if (!error) return 'saved';
    if (error.code === '23505') return 'exists';
    if (isNetworkError(error)) return 'offline';
    return { error };
  } catch (e) {
    return isNetworkError(e) || e instanceof TypeError ? 'offline' : { error: e };
  }
}

let syncing = null;
/** Flushes this user's queue. Returns { synced, failed } where failed items are dropped with a reason. */
export function syncQueue(supabase, userId) {
  if (syncing) return syncing;
  syncing = (async () => {
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
    syncing = null;
  });
  return syncing;
}
