import { Wordmark } from '@/components/Mark';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden bg-ink p-12 text-paper md:flex md:flex-col md:justify-between">
        <Wordmark />
        <div className="max-w-md">
          <p className="text-2xl font-semibold leading-snug tracking-tight">
            Season of Restored Glory.
            <span className="block text-paper/70">Read a little every day, and finish the semester well.</span>
          </p>
          <Stave />
        </div>
        <p className="text-sm text-paper/70">TLV Academic Committee · for members from 100L to 500L</p>
      </aside>
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8 md:justify-center md:py-12">
        <div className="mb-10 md:hidden"><Wordmark /></div>
        {children}
      </main>
    </div>
  );
}

// A decorative week: five days read, one today, one ahead.
function Stave() {
  const marks = [1, 1, 0, 1, 1, 1, 2];
  return (
    <svg viewBox="0 0 280 64" className="mt-8 w-full max-w-sm" aria-hidden="true">
      {[16, 28, 40, 52].map((y) => <line key={y} x1="0" x2="280" y1={y} y2={y} stroke="#F1EEE7" strokeOpacity=".2" />)}
      {marks.map((m, i) => (
        <ellipse key={i} cx={22 + i * 39} cy={46 - i * 4} rx="9" ry="6.5" transform={`rotate(-20 ${22 + i * 39} ${46 - i * 4})`}
          fill={m === 1 ? '#C65B37' : 'none'} stroke={m === 1 ? 'none' : '#F1EEE7'} strokeOpacity={m === 2 ? 0.35 : 0.7} strokeWidth="1.5" />
      ))}
    </svg>
  );
}
