'use client';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/*
  Server actions here return their result without calling revalidatePath, then the page
  re-fetches its data separately. Why: in testing, revalidatePath inside an action whose page
  response streams in several chunks (any non-trivial page, and every page on a slow network)
  made the client drop the action result and leave the button stuck on "Saving…" even though
  the data was saved. Refreshing separately keeps the form state independent of the refetch.
*/
export function useRefreshOnSuccess(state) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  useEffect(() => {
    if (state?.ok) startTransition(() => router.refresh());
  }, [state, router]);
}
