'use client';
import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { toggleSessionDone } from './actions';
import { useHydrated } from '@/components/useHydrated';

/** Flips instantly; the server confirms in the background (slow connections feel fast). */
export function DoneToggle({ id, done }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <form
      action={async (fd) => {
        setOptimisticDone(!done);
        await toggleSessionDone(fd);
        startTransition(() => router.refresh());
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="done" value={done ? '1' : '0'} />
      <ToggleButton done={optimisticDone} />
    </form>
  );
}

function ToggleButton({ done }) {
  const { pending } = useFormStatus();
  const ready = useHydrated();
  return (
    <button className="min-h-11 text-sm font-semibold underline underline-offset-4" aria-pressed={done} disabled={pending || !ready}>
      {done ? 'Mark not done' : 'Mark done'}
    </button>
  );
}
