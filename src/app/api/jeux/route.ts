import { catalogue } from '@/lib/jeux/registre';

export const dynamic = 'force-static';

/** Catalogue public des jeux (manifestes). */
export function GET() {
  return Response.json({
    jeux: [
      ...catalogue().map((m) => ({ ...m, statut: 'jouable' })),
      { code: 'eldoria', nom: 'ELDORIA : LES ROYAUMES BRISÉS', description: 'Jeu de cartes de conquête, d’exploration et d’objectifs secrets : 12 cristaux, 5 factions, un ennemi commun.', visuel: '/eldoria/fond.webp', joueurs: { min: 2, max: 5 }, dureeMinutes: 60, modes: [], options: [], statut: 'en_construction' },
    ],
  });
}
