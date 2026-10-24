import { formatDay } from '@/lib/dates';

/*
  The week at a glance, one mark per day (redesign: check circles, as in the mockups).
  read     → filled sage circle with a check
  pending  → dashed rose ring (saved offline, waiting to sync)
  today    → lavender rounded square (not yet recorded)
  missed   → empty ring ("no recorded activity", not proof the member didn't read)
  ahead    → faint ring
  before   → dotted faint ring (before the member joined)
  Status is carried by shape and by the screen-reader label too, never by colour alone.
*/
export function WeekStave({ days, today, read, pending = [], since = '' }) {
  const readSet = new Set(read);
  const pendingSet = new Set(pending);
  const statusOf = (d) =>
    pendingSet.has(d) && !readSet.has(d) ? 'pending' : readSet.has(d) ? 'read' : d > today ? 'ahead' : d === today ? 'today' : d < since ? 'before' : 'missed';
  const words = { before: 'before you joined', read: 'read', pending: 'saved offline, waiting to sync', missed: 'no reading recorded', today: 'not yet', ahead: 'ahead' };

  return (
    <ol className="grid grid-cols-7 gap-1 text-center" aria-label="This week">
      {days.map((d) => {
        const s = statusOf(d);
        const isToday = d === today;
        return (
          <li key={d} className="grid justify-items-center gap-2">
            <span aria-hidden="true" className={`text-[0.6875rem] ${isToday ? 'font-bold text-lavender-ink' : 'text-muted'}`}>
              {formatDay(d, { weekday: 'short' })}
            </span>
            <span
              aria-hidden="true"
              className={`flex size-9 items-center justify-center ${isToday && s !== 'read' && s !== 'pending' ? 'rounded-xl bg-lavender-wash' : ''}`}
            >
              <Dot status={s} />
            </span>
            <span className="sr-only">{formatDay(d, { weekday: 'long' })}: {words[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Dot({ status }) {
  if (status === 'read') {
    return (
      <svg width="26" height="26" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="12" fill="#4A6145" />
        <path d="M8 13.5l3.2 3.2L18 10" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const ring = {
    pending: { stroke: '#86475A', dash: '3 2.5', fill: '#F6E9ED', width: 1.6 },
    today: { stroke: '#7A5FB0', dash: undefined, fill: '#ffffff', width: 2 },
    missed: { stroke: '#8E918A', dash: undefined, fill: 'none', width: 1.5 },
    ahead: { stroke: '#D3CEC2', dash: undefined, fill: 'none', width: 1.5 },
    before: { stroke: '#D3CEC2', dash: '2 3', fill: 'none', width: 1.2 },
  }[status];
  return (
    <svg width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill={ring.fill} stroke={ring.stroke} strokeWidth={ring.width} strokeDasharray={ring.dash} />
    </svg>
  );
}
