import type { Metadata, Viewport } from 'next';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Ravensburg — jeux de société à secrets', template: '%s · Ravensburg' },
  description: 'Une console au centre, un téléphone par joueur : Ravensburg, le Loup-garou où une fenêtre s’illumine chaque nuit au château Corvin.',
  applicationName: 'Ravensburg',
  appleWebApp: { capable: true, title: 'Ravensburg', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0f14',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
