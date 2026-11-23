import type { Metadata, Viewport } from 'next';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import './globals.css';
import { ACCROCHE, NOM_PLATEFORME } from '@/lib/marque';

export const metadata: Metadata = {
  title: { default: `${NOM_PLATEFORME} — jeux de société à secrets`, template: `%s · ${NOM_PLATEFORME}` },
  description: `${ACCROCHE} Loups-garous édition Ravensburg, et bientôt Cluedo : les Archives du Temps.`,
  applicationName: NOM_PLATEFORME,
  appleWebApp: { capable: true, title: NOM_PLATEFORME, statusBarStyle: 'black-translucent' },
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
