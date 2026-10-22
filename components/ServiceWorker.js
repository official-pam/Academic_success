'use client';
import { useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';

export function ServiceWorker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true';
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
    let previousUser;
    let subscription;
    try {
      ({ data: { subscription } } = getBrowserSupabase().auth.onAuthStateChange((event, session) => {
        const currentUser = session?.user?.id || null;
        if (event === 'SIGNED_OUT' || (previousUser !== undefined && previousUser !== currentUser)) {
          void clearPageCache();
        }
        previousUser = currentUser;
      }));
    } catch { /* Configuration failures are handled by the server. */ }
    return () => subscription?.unsubscribe();
  }, []);
  return null;
}

/** Clear local data directly; serviceWorker.ready can wait forever without a registration. */
export async function clearPageCache() {
  try { localStorage.removeItem('tlv.pending-checkins'); } catch {}
  try {
    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('tlv-pages-')).map((key) => caches.delete(key)));
    }
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PAGES' });
  } catch {}
}
