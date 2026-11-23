import { catalogue } from '@/lib/jeux/registre';

export const dynamic = 'force-static';

/** Catalogue public des jeux (manifestes). */
export function GET() {
  return Response.json({
    jeux: [
      ...catalogue().map((m) => ({ ...m, statut: 'jouable' })),
      { code: 'archives', nom: 'CLUEDO : LES ARCHIVES DU TEMPS', description: 'Un artefact a disparu des Archives du Temps. Enquêtez à travers les civilisations pour démasquer le coupable.', visuel: '/archives/fond.webp', joueurs: { min: 2, max: 6 }, dureeMinutes: 60, modes: [], options: [], statut: 'en_construction' },
    ],
  });
}
