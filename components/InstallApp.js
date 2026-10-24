'use client';
import { useEffect, useState } from 'react';

/*
  "Install the app" (point 6). Android/Chrome: the browser's own install prompt behind one button.
  iPhone/iPad (Safari has no prompt): the two steps to add it to the home screen.
  Hidden once installed (running standalone) or after "Not now".
*/
const KEY = 'tlv.install.dismissed';

export function InstallApp({ compact = false }) {
  const [deferred, setDeferred] = useState(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch {}
    if (standalone || (dismissed && !compact)) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIos(isIos);
    if (isIos) setShow(true);
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setShow(true); };
    const onInstalled = () => setShow(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, [compact]);

  if (!show) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, '1'); } catch {} setShow(false); };

  return (
    <section aria-labelledby="install-heading" className="card-sage grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width="40" height="40" className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <h2 id="install-heading" className="text-sm font-bold">Install TLV Academic</h2>
          <p className="text-sm text-sage-ink">
            {ios
              ? 'Tap the Share button in Safari, then "Add to Home Screen". It opens like an app, full screen.'
              : 'Add it to your home screen. It opens like an app and works with a weak connection.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {deferred && (
          <button type="button" className="btn btn-primary min-h-10" onClick={async () => {
            deferred.prompt();
            const { outcome } = await deferred.userChoice.catch(() => ({}));
            setDeferred(null);
            if (outcome === 'accepted') setShow(false);
          }}>Install app</button>
        )}
        {!compact && <button type="button" className="btn btn-ghost min-h-10" onClick={dismiss}>Not now</button>}
      </div>
    </section>
  );
}
