'use client';
import { useEffect, useState } from 'react';

/** A quiet bar that appears only while the phone is offline. */
export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="bg-ink px-4 py-2 text-center text-sm text-paper">
      You're offline. Check-ins are saved on this phone and sync when you reconnect.
    </div>
  );
}
