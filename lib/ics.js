// Calendar events for "Add to calendar" (point 5). A web app can't write to the phone's calendar directly,
// so we hand the phone a standard .ics event (Android and iPhone both open it in their calendar app)
// or a Google Calendar link. Times are Lagos local (UTC+1, no daylight saving).

const pad = (n) => String(n).padStart(2, '0');
const utcStamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const escapeText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** { title, day: 'YYYY-MM-DD', time: 'HH:MM' | null, minutes, details } -> start/end Date or all-day. */
export function eventTimes({ day, time, minutes }) {
  if (!time) return { allDay: true, day };
  const start = new Date(`${day}T${time.slice(0, 5)}:00+01:00`);
  const end = new Date(start.getTime() + (minutes || 60) * 60000);
  return { allDay: false, start, end };
}

export function icsFor(ev, uid) {
  const t = eventTimes(ev);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TLV Academic//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@tlv-academic`,
    `DTSTAMP:${utcStamp(new Date())}`,
    ...(t.allDay
      ? [`DTSTART;VALUE=DATE:${ev.day.replace(/-/g, '')}`]
      : [`DTSTART:${utcStamp(t.start)}`, `DTEND:${utcStamp(t.end)}`]),
    `SUMMARY:${escapeText(ev.title)}`,
    `DESCRIPTION:${escapeText(ev.details || 'From TLV Academic')}`,
    ...(t.allDay ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(ev.title)}`, 'TRIGGER:-PT10M', 'END:VALARM']),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

export function googleCalendarUrl(ev) {
  const t = eventTimes(ev);
  const dates = t.allDay
    ? `${ev.day.replace(/-/g, '')}/${ev.day.replace(/-/g, '')}`
    : `${utcStamp(t.start)}/${utcStamp(t.end)}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates, details: ev.details || 'From TLV Academic', ctz: 'Africa/Lagos' });
  return `https://calendar.google.com/calendar/render?${q}`;
}
