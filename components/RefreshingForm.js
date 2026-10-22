'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** A form for a server action that stays on the page: runs the action, then re-fetches the page. */
export function RefreshingForm({ action, children, className }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={className}
      aria-busy={pending}
      action={async (fd) => {
        await action(fd);
        startTransition(() => router.refresh());
      }}
    >
      {children}
    </form>
  );
}
