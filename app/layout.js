import './globals.css';
import { ServiceWorker } from '@/components/ServiceWorker';
import { NetworkStatus } from '@/components/NetworkStatus';

export const metadata = {
  title: { default: 'TLV Academic', template: '%s · TLV Academic' },
  description: 'Daily reading, assignments and support for TLV Season of Restored Glory choir members, 100L to 500L.',
  manifest: '/manifest.json',
  applicationName: 'TLV Academic',
  appleWebApp: { capable: true, title: 'TLV Academic', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#F1EEE7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-NG">
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <NetworkStatus />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
