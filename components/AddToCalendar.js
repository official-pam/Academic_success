'use client';
import { icsFor, googleCalendarUrl } from '@/lib/ics';

/** "Add to calendar": a .ics file the phone opens in its calendar app, or Google Calendar. */
export function AddToCalendar({ event, uid, compact = false }) {
  function download() {
    const blob = new Blob([icsFor(event, uid)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^\w\- ]+/g, '').trim().slice(0, 40) || 'study-session'}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return (
    <details className="group">
      <summary className={`flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold underline underline-offset-4 ${compact ? '' : 'text-lavender-ink'}`}>
        Add to calendar
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={download} className="btn btn-soft min-h-10 px-4">Phone calendar</button>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-10 px-4">Google Calendar</a>
      </div>
    </details>
  );
}
