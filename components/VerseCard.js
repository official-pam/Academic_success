'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { toggleMemorised } from '@/app/(member)/verses/actions';
import { SubmitButton } from '@/components/forms';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';

import { VerseBackground, themeFor } from '@/components/VerseBackground';

// Memory verse card for Today and the verses page. Backgrounds live in VerseBackground (server-safe).
export function VerseCard({ verse, index, memorised, showPastLink = true }) {
  const [state, action] = useActionState(toggleMemorised, null);
  useRefreshOnSuccess(state);
  const isMemorised = state?.ok ? state.memorised : memorised;
  const t = themeFor(index);

  return (
    <section aria-labelledby="verse-heading" className="relative overflow-hidden rounded-[var(--radius-panel)] shadow-[var(--shadow-soft)]">
      <VerseBackground theme={t} />
      <div className="relative grid gap-4 p-5 pr-20">
        <p id="verse-heading" className="eyebrow" style={{ color: t.ink }}>Today's memory verse</p>
        <p className="display text-[1.75rem] leading-tight text-ink">{verse.label}</p>
        <p className="text-sm text-ink/80">Read it, say it aloud a few times, and carry it with you today.</p>
        <div className="flex flex-wrap gap-2">
          <a href={verse.nkjv} target="_blank" rel="noopener noreferrer" className="btn min-h-10 bg-surface/90 px-3.5 text-ink shadow-sm hover:bg-surface">
            Read in NKJV <span aria-hidden="true">↗</span>
          </a>
          <a href={verse.niv} target="_blank" rel="noopener noreferrer" className="btn min-h-10 bg-surface/90 px-3.5 text-ink shadow-sm hover:bg-surface">
            Read in NIV <span aria-hidden="true">↗</span>
          </a>
        </div>
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="verse_ref" value={verse.ref} />
          <input type="hidden" name="memorised" value={isMemorised ? '1' : '0'} />
          {isMemorised ? (
            <>
              <span role="status" className="chip text-white" style={{ background: t.ink }}>✓ Memorised</span>
              <SubmitButton className="btn-quiet text-sm font-semibold text-ink underline-offset-4 hover:underline" pendingLabel="Saving…">Undo</SubmitButton>
            </>
          ) : (
            <SubmitButton className="btn btn-ink min-h-10" pendingLabel="Saving…">I've memorised it</SubmitButton>
          )}
          {showPastLink && (
            <Link href="/verses" className="text-sm font-semibold underline-offset-4 hover:underline" style={{ color: t.ink }}>Past verses</Link>
          )}
        </form>
        {state?.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      </div>
    </section>
  );
}
