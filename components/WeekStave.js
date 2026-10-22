import { formatDay } from '@/lib/dates';

/*
  This product's signature element: the week drawn as a stave, one note per day.
  A day read is a filled clay note; a day saved offline is a dashed note; a day missed is an
  empty note; days ahead are faint. Status is carried by shape and by the text label too, never
  by colour alone.
*/
export function WeekStave({ days, today, read, pending = [], since = '' }) {
  const readSet = new Set(read);
  const pendingSet = new Set(pending);
  const W = 320, step = W / 7;
  const statusOf = (d) =>
    pendingSet.has(d) && !readSet.has(d) ? 'pending' : readSet.has(d) ? 'read' : d > today ? 'ahead' : d === today ? 'today' : d < since ? 'before' : 'missed';
  const words = { before: 'before you joined', read: 'read', pending: 'saved offline, waiting to sync', missed: 'not recorded', today: 'not yet', ahead: 'ahead' };

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} 76`} className="block h-auto w-full" aria-hidden="true">
        {[18, 30, 42, 54].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#DCD8CB" strokeWidth="1" />)}
        {days.map((d, i) => {
          const s = statusOf(d);
          const cx = step * i + step / 2;
          const cy = 48 - i * 3.2;
          const common = { cx, cy, rx: 9.5, ry: 7, transform: `rotate(-20 ${cx} ${cy})` };
          return (
            <g key={d}>
              {s === 'read' && <ellipse {...common} fill="#C65B37" />}
              {s === 'pending' && <ellipse {...common} fill="#F4E3DA" stroke="#A3452A" strokeWidth="1.5" strokeDasharray="3 2.5" />}
              {s === 'missed' && <ellipse {...common} fill="none" stroke="#565A53" strokeWidth="1.5" />}
              {s === 'today' && <ellipse {...common} fill="none" stroke="#20221F" strokeWidth="2" />}
              {s === 'before' && <ellipse {...common} fill="none" stroke="#DCD8CB" strokeWidth="1.2" strokeDasharray="2 3" />}
              {s === 'ahead' && <ellipse {...common} fill="none" stroke="#B9B4A6" strokeWidth="1.2" />}
              {(s === 'read' || s === 'pending') && (
                <line x1={cx + 8.6} x2={cx + 8.6} y1={cy - 1} y2={cy - 24} stroke={s === 'read' ? '#C65B37' : '#A3452A'} strokeWidth="1.6" strokeLinecap="round" />
              )}
            </g>
          );
        })}
      </svg>
      <ol className="grid grid-cols-7 text-center text-xs" aria-label="This week">
        {days.map((d) => {
          const s = statusOf(d);
          return (
            <li key={d} className={d === today ? 'font-bold text-ink' : 'text-muted'}>
              <span aria-hidden="true">{formatDay(d, { weekday: 'narrow' })}</span>
              <span className="sr-only">{formatDay(d, { weekday: 'long' })}: {words[s]}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
