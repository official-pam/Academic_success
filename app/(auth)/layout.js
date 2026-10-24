import { Wordmark } from '@/components/Mark';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden flex-col justify-between bg-lavender-wash p-12 md:flex">
        <Wordmark mark />
        <div className="max-w-md">
          <p className="eyebrow">Season of Restored Glory</p>
          <p className="display mt-4 text-[3rem] leading-[1.05]">
            Your semester,<br />organised.
          </p>
          <p className="mt-4 text-base text-muted">Read a little every day, plan your courses, and finish the semester well.</p>
          <Week />
        </div>
        <p className="text-sm text-muted">TLV Academic Committee · for members from 100L to 500L</p>
      </aside>
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8 md:justify-center md:py-12">
        <div className="mb-10 md:hidden"><Wordmark mark /></div>
        {children}
      </main>
    </div>
  );
}

// A decorative week: five days read, one today, one ahead.
function Week() {
  const marks = ['read', 'read', 'empty', 'read', 'read', 'read', 'today'];
  return (
    <div className="mt-10 flex gap-3" aria-hidden="true">
      {marks.map((m, i) => (
        <span key={i} className={`flex size-10 items-center justify-center ${m === 'today' ? 'rounded-xl bg-surface' : ''}`}>
          <svg width="28" height="28" viewBox="0 0 26 26">
            {m === 'read' ? (
              <>
                <circle cx="13" cy="13" r="12" fill="#4A6145" />
                <path d="M8 13.5l3.2 3.2L18 10" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <circle cx="13" cy="13" r="11" fill="none" stroke={m === 'today' ? '#7A5FB0' : '#8E918A'} strokeWidth={m === 'today' ? 2 : 1.5} />
            )}
          </svg>
        </span>
      ))}
    </div>
  );
}
