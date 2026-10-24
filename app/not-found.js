import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md content-center gap-4 px-6">
      <h1 className="display text-[2.25rem] leading-[1.08]">Page not found</h1>
      <Link href="/today" className="btn btn-primary justify-self-start">Go to Today</Link>
    </main>
  );
}
