import { Wordmark } from '@/components/Mark';

export const metadata = { title: 'Offline' };
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md content-center gap-6 px-6 py-10">
      <Wordmark />
      <h1 className="display text-[2.25rem] leading-[1.08]">You're offline</h1>
      <p className="text-base">
        Reconnect to open your reading pages. If Today is already open, you can record a check-in offline
        and it will wait on this phone until it syncs. Private pages are not stored for offline reopening.
      </p>
      <a href="/today" className="btn btn-primary justify-self-start">Try Today again</a>
    </main>
  );
}
