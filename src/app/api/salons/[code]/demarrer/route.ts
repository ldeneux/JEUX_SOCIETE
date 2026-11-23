import { demarrerPartie } from '@/lib/jeux/moteur';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { chargerFraicheur } from '@/lib/serveur/fraicheur';
import { creerDeps, repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Lance la partie (hôte uniquement). */
export async function POST(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    if (salon.hote_id !== user.id) throw new ErreurHttp(403, 'Réservé à l’hôte');
    if (salon.statut !== 'attente') throw new ErreurHttp(409, 'La partie a déjà commencé');

    const options: Record<string, unknown> = { ...salon.options };
    if (salon.jeu_code === 'loupgarou') options.fraicheur = await chargerFraicheur(sb, salon.hote_id);

    try {
      await demarrerPartie(creerDeps(sb, salon), salon.id, salon.jeu_code, salon.mode, options);
    } catch (e) {
      await sb.from('plateforme_etats').delete().eq('salon_id', salon.id); // permet de réessayer proprement
      throw e;
    }
    await sb.from('plateforme_salons').update({ statut: 'en_cours' }).eq('id', salon.id);
  });
}
