'use client';
import { useEffect } from 'react';

export function ServiceWorker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'; // lets tests wait for interactivity
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}

/** Remove cached pages (they may hold personal data) when someone signs out. */
export async function clearPageCache() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    reg?.active?.postMessage({ type: 'CLEAR_PAGES' });
  } catch {}
  try {
    localStorage.removeItem('tlv.pending-checkins');
  } catch {}
}
