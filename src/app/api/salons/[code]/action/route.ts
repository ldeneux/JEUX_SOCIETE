import { soumettreAction } from '@/lib/jeux/moteur';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { creerDeps, finaliserSiBesoin, repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Action d'un joueur depuis son téléphone. Body : { id, valeur } */
export async function POST(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    const { id, valeur } = await req.json();
    if (typeof id !== 'string') throw new ErreurHttp(400, 'Action invalide');

    // Un conflit de version (deux actions simultanées) est rejoué automatiquement.
    for (let essai = 0; ; essai++) {
      try {
        const res = await soumettreAction(creerDeps(sb, salon), salon.id, user.id, { id, valeur });
        await finaliserSiBesoin(sb, salon, res.etat);
        return { version: res.version };
      } catch (e: any) {
        if (e?.code === 'conflit' && essai < 2) continue;
        throw e;
      }
    }
  });
}
