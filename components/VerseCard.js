'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { toggleMemorised } from '@/app/(member)/verses/actions';
import { SubmitButton } from '@/components/forms';
import { useRefreshOnSuccess } from '@/components/useRefreshOnSuccess';
import { photoFor } from '@/lib/verse-photos';

/*
  Memory verse card (points 3 and 11): the full verse and its reference on a real nature photograph.
  A dark scrim under the words keeps them readable (white on the scrim is above 7:1).
  Nothing here opens a Bible site; the verse is right on the card.
*/
export function VerseCard({ verse, index, memorised, showPastLink = true }) {
  const [state, action] = useActionState(toggleMemorised, null);
  useRefreshOnSuccess(state);
  const isMemorised = state?.ok ? state.memorised : memorised;
  const photo = photoFor(index);

  return (
    <section aria-labelledby="verse-heading" className="relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-ink text-white shadow-[var(--shadow-soft)]">
      <img
        src={photo.src}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(20_22_21/0.35)_0%,rgb(20_22_21/0.55)_45%,rgb(20_22_21/0.82)_100%)]" />
      <div className="grid min-h-[22rem] content-end gap-4 p-5 pt-16">
        <p id="verse-heading" className="text-xs font-semibold uppercase tracking-[0.14em] text-white/85">Today's memory verse</p>
        <blockquote className="m-0">
          <p className="display text-[1.5rem] leading-snug md:text-[1.75rem]">“{verse.text}”</p>
          <footer className="mt-3 text-base font-semibold text-white/95">
            {verse.label} <span className="font-normal text-white/75">· {verse.version}</span>
          </footer>
        </blockquote>
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="verse_ref" value={verse.ref} />
          <input type="hidden" name="memorised" value={isMemorised ? '1' : '0'} />
          {isMemorised ? (
            <>
              <span role="status" className="chip bg-sage-wash text-sage-ink">✓ Memorised</span>
              <SubmitButton className="btn-quiet text-sm font-semibold text-white underline-offset-4 hover:underline" pendingLabel="Saving…">Undo</SubmitButton>
            </>
          ) : (
            <SubmitButton className="btn min-h-10 bg-white text-ink hover:bg-paper" pendingLabel="Saving…">I've memorised it</SubmitButton>
          )}
          {showPastLink && (
            <Link href="/verses" className="text-sm font-semibold text-white underline-offset-4 hover:underline">Past verses</Link>
          )}
        </form>
        {state?.message && <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">{state.message}</p>}
        <p className="text-[0.6875rem] text-white/70">Photo: Unsplash · {photo.alt}</p>
      </div>
    </section>
  );
}
