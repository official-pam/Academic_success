'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useHydrated } from '@/components/useHydrated';
import { AddToCalendar } from '@/components/AddToCalendar';

/*
  Focus timer (point 5). It rings when time is up: a chime, a vibration and, if allowed, a notification.
  The running timer is stored on the phone (start and end time), so closing or refreshing the page doesn't lose
  it, and the session is saved when it ends. If saving fails offline it is kept and retried.

  What a web app can and can't do: the chime plays while the app is open (screen on is best; we ask the phone to
  keep the screen awake). With the phone locked or the app in the background, phones may pause web pages, so the
  notification can be late; the session is still recorded correctly the next time the app opens.
*/
const KEY = 'tlv.focus.running';
const QUEUE = 'tlv.focus.pending';
const PRESETS = [25, 45, 60, 90];

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let audioCtx;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}

/** A soft three-note bell, repeated three times (about 6 seconds). */
function ring() {
  try {
    unlockAudio();
    const ctx = audioCtx;
    const notes = [880, 1108.73, 1318.51];
    for (let r = 0; r < 3; r++) {
      notes.forEach((f, i) => {
        const t = ctx.currentTime + r * 2 + i * 0.28;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 1.5);
      });
    }
  } catch {}
  try { navigator.vibrate?.([400, 200, 400, 200, 800]); } catch {}
}

async function notify(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'tlv-focus', renotify: true, data: { url: '/focus' } });
    else new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {}
}

async function sendSession(row) {
  if (!navigator.onLine) return false;
  const { error } = await getBrowserSupabase().from('focus_sessions').insert(row);
  return !error || error.code === '23505';
}

async function flushQueue() {
  const items = load(QUEUE, []);
  if (!items.length) return 0;
  const left = [];
  let sent = 0;
  for (const row of items) (await sendSession(row)) ? sent++ : left.push(row);
  save(QUEUE, left);
  return sent;
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function FocusTimer({ userId, courses, initialEnrolment }) {
  const router = useRouter();
  const ready = useHydrated();
  const [running, setRunning] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(45);
  const [custom, setCustom] = useState('');
  const [enrolment, setEnrolment] = useState(initialEnrolment || (courses[0]?.id ?? ''));
  const [label, setLabel] = useState('');
  const [finished, setFinished] = useState(null);
  const [notice, setNotice] = useState('');
  const wakeRef = useRef(null);

  const finish = useCallback(async (run, completed) => {
    const end = completed ? run.end_at : Date.now();
    const rawMin = (end - run.started_at) / 60000;
    const actual = Math.max(1, Math.round(rawMin));
    save(KEY, null);
    setRunning(null);
    try { await wakeRef.current?.release(); } catch {}
    if (completed) {
      ring();
      notify('Time is up', `${run.label}: ${run.planned_min} minutes done. Take a short break.`);
    }
    if (!completed && rawMin < 1) { setNotice('Stopped in under a minute, so nothing was saved.'); return; }
    const row = {
      id: run.id, user_id: userId, enrolment_id: run.enrolment_id || null, label: run.label,
      planned_min: run.planned_min, actual_min: actual, completed,
      started_at: new Date(run.started_at).toISOString(), ended_at: new Date(end).toISOString(),
    };
    const ok = await sendSession(row).catch(() => false);
    if (!ok) save(QUEUE, [...load(QUEUE, []), row]);
    setFinished({ ...row, saved: ok });
    router.refresh();
  }, [router, userId]);

  // Restore a running timer after a reload, and send anything saved offline.
  useEffect(() => {
    const run = load(KEY, null);
    if (run?.user_id === userId) {
      if (Date.now() >= run.end_at) finish(run, true);
      else setRunning(run);
    }
    flushQueue().then((n) => n && router.refresh());
    const online = () => flushQueue().then((n) => n && router.refresh());
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [userId, finish, router]);

  // Tick, and finish exactly when the time is up (also re-checked when the page becomes visible again).
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= running.end_at) finish(running, true);
    };
    const id = setInterval(tick, 500);
    const vis = async () => {
      tick();
      if (document.visibilityState === 'visible' && 'wakeLock' in navigator && !wakeRef.current) {
        try { wakeRef.current = await navigator.wakeLock.request('screen'); } catch {}
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [running, finish]);

  async function start() {
    const planned = custom ? Number(custom) : minutes;
    if (!(planned >= 1 && planned <= 240)) { setNotice('Choose 1 to 240 minutes.'); return; }
    const course = courses.find((c) => c.id === enrolment);
    const text = course ? `${course.course_code} ${course.course_title}` : (label.trim() || 'Reading');
    unlockAudio(); // must happen on a tap so the chime can play later
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    if ('wakeLock' in navigator) { try { wakeRef.current = await navigator.wakeLock.request('screen'); } catch {} }
    const started = Date.now();
    const run = { id: crypto.randomUUID(), user_id: userId, enrolment_id: course?.id || null, label: text.slice(0, 200), planned_min: planned, started_at: started, end_at: started + planned * 60000 };
    save(KEY, run);
    setFinished(null);
    setNotice('');
    setRunning(run);
    setNow(started);
  }

  if (running) {
    const left = running.end_at - now;
    const total = running.end_at - running.started_at;
    const pct = Math.min(100, Math.max(0, ((total - left) / total) * 100));
    return (
      <section aria-labelledby="timer-heading" className="card-lavender grid justify-items-center gap-5 px-5 py-8 text-center">
        <h2 id="timer-heading" className="text-sm font-semibold text-lavender-ink">Focusing on</h2>
        <p className="-mt-3 max-w-md text-lg font-bold">{running.label}</p>
        <div className="relative grid size-56 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface)" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-lavender-strong)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 282.7} 282.7`} />
          </svg>
          <p className="num display text-[3.25rem] leading-none" role="timer" aria-live="off" aria-label={`${Math.ceil(left / 60000)} minutes left`}>{mmss(left)}</p>
        </div>
        <p className="text-sm text-muted">Ends at {new Date(running.end_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' })}. Keep this screen open for the alarm.</p>
        <button type="button" onClick={() => finish(running, false)} className="btn btn-outline">Stop early</button>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      {finished && (
        <div role="status" className="card-sage grid gap-1 p-5">
          <p className="text-lg font-bold">{finished.completed ? 'Session complete' : 'Session saved'}</p>
          <p className="text-sm">
            {finished.label} · <span className="num">{finished.actual_min}</span> min
            {finished.saved ? '. Your committee head can see it.' : '. Saved on this phone; it will sync when you\'re online.'}
          </p>
        </div>
      )}
      <section aria-labelledby="setup-heading" className="panel grid gap-5 p-5">
        <h2 id="setup-heading" className="text-base font-bold">Start a focus session</h2>
        <div className="field">
          <label htmlFor="focus-course" className="label">Course</label>
          <select id="focus-course" className="input" value={enrolment} onChange={(e) => setEnrolment(e.target.value)}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.course_code} · {c.course_title}</option>)}
            <option value="">Something else</option>
          </select>
        </div>
        {!enrolment && (
          <div className="field">
            <label htmlFor="focus-label" className="label">What are you studying?</label>
            <input id="focus-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} placeholder="e.g. Past questions" />
          </div>
        )}
        <fieldset className="grid gap-2">
          <legend className="label">How long?</legend>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((m) => (
              <button key={m} type="button" onClick={() => { setMinutes(m); setCustom(''); }} aria-pressed={!custom && minutes === m}
                className={`min-h-11 rounded-full border text-sm font-semibold ${!custom && minutes === m ? 'border-lavender-strong bg-lavender-strong text-white' : 'border-stone bg-surface'}`}>
                {m} min
              </button>
            ))}
          </div>
          <label className="mt-1 flex items-center gap-2 text-sm">
            Or
            <input type="number" inputMode="numeric" min="1" max="240" value={custom} onChange={(e) => setCustom(e.target.value)} className="input num min-h-10 w-24" aria-label="Custom minutes" />
            minutes
          </label>
        </fieldset>
        {notice && <p role="alert" className="text-sm text-danger">{notice}</p>}
        <button type="button" onClick={start} disabled={!ready} className="btn btn-accent min-h-14 text-base">
          {ready ? 'Start timer' : 'Loading…'}
        </button>
        <p className="text-xs text-muted">The alarm rings when time is up. Allow notifications when asked so you're alerted even if you switch apps.</p>
      </section>
      <section aria-labelledby="later-heading" className="panel grid gap-2 p-5">
        <h2 id="later-heading" className="text-base font-bold">Study later?</h2>
        <p className="text-sm text-muted">Put a focus block in your phone's calendar, with a reminder 10 minutes before.</p>
        <ScheduleLater courses={courses} />
      </section>
    </div>
  );
}

function ScheduleLater({ courses }) {
  const [day, setDay] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState('16:00');
  const [mins, setMins] = useState(45);
  const [course, setCourse] = useState(courses[0]?.id || '');
  const c = courses.find((x) => x.id === course);
  const title = `Focus: ${c ? `${c.course_code} ${c.course_title}` : 'Reading'}`;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold text-muted sm:col-span-2">Course
          <select value={course} onChange={(e) => setCourse(e.target.value)} className="input min-h-10 text-sm text-ink">
            {courses.map((x) => <option key={x.id} value={x.id}>{x.course_code}</option>)}
            <option value="">Reading</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted">Date<input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="input min-h-10 text-sm text-ink" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted">Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input min-h-10 text-sm text-ink" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted">Minutes<input type="number" min="5" max="240" value={mins} onChange={(e) => setMins(Number(e.target.value) || 45)} className="input num min-h-10 text-sm text-ink" /></label>
      </div>
      <AddToCalendar uid={`focus-${day}-${time}-${course}`} event={{ title, day, time, minutes: mins, details: 'Focus session planned in TLV Academic' }} />
    </div>
  );
}
