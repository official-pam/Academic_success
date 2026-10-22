'use client';
export default function Error({ reset }) {
  return (
    <div role="alert" className="panel grid gap-3 p-5">
      <h1 className="text-lg font-bold">Something went wrong loading this page.</h1>
      <p className="text-sm text-muted">If you're offline, your check-ins are still saved on this phone.</p>
      <button onClick={reset} className="btn btn-outline justify-self-start">Try again</button>
    </div>
  );
}
