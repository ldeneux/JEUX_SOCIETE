import { catalogue } from '@/lib/jeux/registre';

export const dynamic = 'force-static';

/** Catalogue public des jeux (manifestes). */
export function GET() {
  return Response.json({
    jeux: [
      ...catalogue().map((m) => ({ ...m, statut: 'jouable' })),
      { code: 'manoir', nom: 'Meurtre au manoir', description: 'Enquête et déduction dans un manoir.', visuel: '', joueurs: { min: 3, max: 6 }, dureeMinutes: 60, modes: [], options: [], statut: 'en_construction' },
    ],
  });
}
