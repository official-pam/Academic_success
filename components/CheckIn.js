'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { enqueue, pendingFor, sendCheckin, syncQueue, updateQueued } from '@/lib/offline-queue';
import { WeekStave } from '@/components/WeekStave';
import { useHydrated } from '@/components/useHydrated';
import { lagosToday, streak as streakOf, formatDateTime } from '@/lib/dates';

/*
  Daily check-in (spec flow A). States: not completed, submitting, completed,
  offline pending, failed. The server is the only source of "saved"; anything else is shown
  as pending, never as done.
*/
export function CheckIn({ userId, today, todayCheckin, weekDays, weekRead, recentDays, goalDays, since = '' }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(todayCheckin ? 'done' : 'idle'); // idle | sending | done | pending | failed
  const [record, setRecord] = useState(todayCheckin); // { id, minutes, note, created_at }
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const ready = useHydrated();

  const refreshPending = useCallback(() => {
    const items = pendingFor(userId);
    setPending(items);
    const todays = items.find((i) => i.day === today);
    if (todays && !todayCheckin) {
      setStatus((s) => (s === 'sending' ? s : 'pending'));
      setRecord((r) => r || todays);
    }
  }, [userId, today, todayCheckin]);

  const flush = useCallback(async () => {
    if (!pendingFor(userId).length) return;
    let outcome;
    try { outcome = await syncQueue(getBrowserSupabase(), userId); } catch {
      setMessage('Could not access saved check-ins on this phone. Keep this page open and try again.');
      return;
    }
    const { synced, failed } = outcome;
    refreshPending();
    if (failed.length) {
      setStatus('failed');
      setMessage(`One check-in couldn't sync (${failed[0].message}). Record it again if it's still within 7 days.`);
    }
    if (synced) {
      setMessage(synced === 1 ? 'Your offline check-in has synced.' : `${synced} offline check-ins have synced.`);
      startTransition(() => router.refresh());
    }
  }, [userId, refreshPending, router]);

  useEffect(() => {
    refreshPending();
    flush();
    const onQueue = () => refreshPending();
    window.addEventListener('online', flush);
    window.addEventListener('tlv:queue', onQueue);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('tlv:queue', onQueue);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [refreshPending, flush]);

  // Server data arrived after a refresh: trust it.
  useEffect(() => {
    if (todayCheckin) {
      setStatus('done');
      setRecord(todayCheckin);
    }
  }, [todayCheckin]);

  async function checkIn() {
    if (status === 'sending' || status === 'done' || status === 'pending') return; // no double taps
    const day = lagosToday(); // recompute: the page may have been open since yesterday
    const item = { id: crypto.randomUUID(), user_id: userId, day, minutes: null, note: '' };
    setStatus('sending');
    setMessage('');
    const result = await sendCheckin(getBrowserSupabase(), item);
    if (result === 'saved' || result === 'exists') {
      const { data: saved, error: readError } = await getBrowserSupabase().from('checkins').select('id, minutes, note, created_at').eq('day', day).single();
      if (readError || !saved) {
        setStatus('failed');
        setMessage('Your check-in may have saved, but could not be confirmed. Reconnect and try again.');
        return;
      }
      setRecord(saved);
      setStatus('done');
      startTransition(() => router.refresh());
    } else if (result === 'offline') {
      try { enqueue(item); } catch {
        setStatus('failed');
        setMessage('This phone could not store your check-in. Reconnect and try again before closing this page.');
        return;
      }
      setRecord(item);
      setStatus('pending');
    } else {
      setStatus('failed');
      setMessage('Couldn\'t record your check-in. Check your connection and try again.');
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const minutes = fd.get('minutes') ? Number(fd.get('minutes')) : null;
    const note = String(fd.get('note') || '').trim().slice(0, 500);
    if (minutes !== null && (!Number.isInteger(minutes) || !(minutes >= 1 && minutes <= 600))) {
      setMessage('Minutes should be between 1 and 600.');
      return;
    }
    if (status === 'pending') {
      try { updateQueued(record.id, { minutes, note }); } catch {
        setMessage('This phone could not store your note. Reconnect and try again.');
        return;
      }
      setRecord({ ...record, minutes, note });
      setShowDetails(false);
      setMessage('Saved on this phone. It will sync with your check-in.');
      return;
    }
    const { data: saved, error } = await getBrowserSupabase().from('checkins').update({ minutes, note: note || null }).eq('id', record.id).select('id').maybeSingle();
    if (error || !saved) {
      setMessage('Couldn\'t save the note. Try again when you\'re online.');
      return;
    }
    setRecord({ ...record, minutes, note });
    setShowDetails(false);
    setMessage('Saved.');
    startTransition(() => router.refresh());
  }

  // Progress includes pending days so the stave matches what the member did, labelled as pending.
  const pendingDays = pending.map((p) => p.day);
  const readThisWeek = new Set([...weekRead, ...(status === 'done' ? [today] : [])]);
  const pendingThisWeek = weekDays.filter((d) => pendingDays.includes(d) && !readThisWeek.has(d));
  const count = readThisWeek.size + pendingThisWeek.length;
  const streakDays = streakOf([...recentDays, ...pendingDays, ...(status === 'done' ? [today] : [])], today);
  const left = Math.max(goalDays - count, 0);
  const daysLeftInWeek = weekDays.filter((d) => d > today).length + (readThisWeek.has(today) || pendingDays.includes(today) ? 0 : 1);

  return (
    <section aria-labelledby="checkin-heading" className="grid gap-6">
      <h2 id="checkin-heading" className="sr-only">Today's check-in</h2>

      {status === 'done' ? (
        <div role="status" className="card-sage flex items-center gap-4 px-5 py-4">
          <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#4A6145" /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="min-w-0">
            <p className="text-base font-bold">You read today</p>
            <p className="text-sm text-sage-ink">
              Recorded{record?.created_at ? ` at ${formatDateTime(record.created_at, { hour: 'numeric', minute: '2-digit' })}` : ''}
              {record?.minutes ? ` · ${record.minutes} min` : ''}
            </p>
          </div>
        </div>
      ) : status === 'pending' ? (
        <div role="status" className="flex items-center gap-4 rounded-[var(--radius-panel)] border-2 border-dashed border-rose-ink bg-rose-wash px-5 py-4">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="#86475A" strokeWidth="2" strokeDasharray="4 3" /><path d="M12 7v5l3 2" stroke="#86475A" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          <div>
            <p className="text-base font-bold">Saved on this phone</p>
            <p className="text-sm text-rose-ink">Not synced yet. It will send when you're back online.</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={checkIn}
          disabled={status === 'sending' || !ready}
          aria-busy={status === 'sending' || !ready}
          className="btn btn-primary min-h-16 w-full text-lg shadow-[var(--shadow-soft)]"
        >
          {status === 'sending' ? 'Recording…' : ready ? 'I read today' : 'Loading…'}
        </button>
      )}

      <div aria-live="polite" className="min-h-0">
        {message && <p className={`text-sm ${status === 'failed' ? 'text-danger' : 'text-sage-ink'}`}>{message}</p>}
      </div>

      {(status === 'done' || status === 'pending') && !showDetails && (
        <button type="button" onClick={() => setShowDetails(true)} className="btn btn-quiet -mt-4 justify-self-start px-0">
          {record?.note || record?.minutes ? 'Edit minutes or note' : 'Add minutes or a private note'}
        </button>
      )}
      {showDetails && (
        <form onSubmit={saveDetails} className="panel -mt-2 grid gap-4 p-4">
          <div className="field">
            <label htmlFor="minutes" className="label">Minutes read <span className="font-normal text-muted">(optional)</span></label>
            <input id="minutes" name="minutes" type="number" inputMode="numeric" min="1" max="600" defaultValue={record?.minutes ?? ''} className="input num max-w-32" />
          </div>
          <div className="field">
            <label htmlFor="note" className="label">Note <span className="font-normal text-muted">(only you can see this)</span></label>
            <textarea id="note" name="note" rows={3} maxLength={500} defaultValue={record?.note ?? ''} className="input" placeholder="What did you read?" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-outline" onClick={() => setShowDetails(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="panel grid gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">
<span className="num">{count}</span> of <span className="num">{goalDays}</span> days this week
            {pendingThisWeek.length > 0 && <span className="font-medium text-rose-ink"> ({pendingThisWeek.length} waiting to sync)</span>}
          </p>
          {streakDays > 1 && (
            <span className="chip bg-rose-wash text-rose-ink">
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="mr-1"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.7 1.2 2.6 2.1 2.6C11.5 8.5 11 6 12 3z" fill="currentColor" /></svg>
              {streakDays}-day streak
            </span>
          )}
        </div>
        <WeekStave days={weekDays} today={today} read={[...readThisWeek]} pending={pendingThisWeek} since={since} />
        <p className="text-sm text-muted">
          {count >= goalDays
            ? 'Weekly goal reached. Anything more is a bonus.'
            : left <= daysLeftInWeek
              ? `${left} more ${left === 1 ? 'day' : 'days'} to reach this week's goal.`
              : `${daysLeftInWeek} ${daysLeftInWeek === 1 ? 'day' : 'days'} left this week. Every day still counts.`}
        </p>
      </div>
    </section>
  );
}

