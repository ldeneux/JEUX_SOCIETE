import type { MetadataRoute } from 'next';

import { NOM_PLATEFORME } from '@/lib/marque';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOM_PLATEFORME,
    short_name: NOM_PLATEFORME,
    description: 'Jeux de société à secrets : une console, des téléphones.',
    start_url: '/jouer',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0d0f14',
    theme_color: '#0d0f14',
    lang: 'fr',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
