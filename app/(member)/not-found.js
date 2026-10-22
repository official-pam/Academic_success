import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p>This item may have been archived, or it's for another level.</p>
      <Link href="/today" className="btn btn-outline justify-self-start">Back to Today</Link>
    </div>
  );
}
