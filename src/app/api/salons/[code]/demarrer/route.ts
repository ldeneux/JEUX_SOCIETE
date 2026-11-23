import { creerRng } from '@/lib/jeux/contract';
import { tirerNomsIA } from '@/lib/jeux/ia-noms';
import { demarrerPartie } from '@/lib/jeux/moteur';
import { obtenirModule } from '@/lib/jeux/registre';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { chargerFraicheur } from '@/lib/serveur/fraicheur';
import { apresTransition, creerDeps, nbIA, repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Lance la partie (hôte uniquement). Les joueurs IA demandés sont créés ici, avec des prénoms libres. */
export async function POST(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    if (salon.hote_id !== user.id) throw new ErreurHttp(403, 'Réservé à l’hôte');
    if (salon.statut !== 'attente') throw new ErreurHttp(409, 'La partie a déjà commencé');

    const { min, max } = obtenirModule(salon.jeu_code).manifeste.joueurs;
    const { data: humains, error } = await sb.from('plateforme_joueurs').select('pseudo,place').eq('salon_id', salon.id);
    if (error) throw error;
    const nbHumains = humains?.length ?? 0;
    // Priorité aux humains : si la table est trop petite, ce sont les IA en trop qui sont retirées.
    const ia = Math.min(nbIA(salon.options, max), Math.max(0, max - nbHumains));
    if (nbHumains + ia < min) throw new ErreurHttp(400, `Il faut au moins ${min} joueurs : ajoute ${min - nbHumains - ia} joueur(s) IA ou invite des amis.`);
    if (nbHumains > max) throw new ErreurHttp(400, `Maximum ${max} joueurs.`);

    // Prénoms aléatoires, jamais ceux des humains.
    const noms = tirerNomsIA(ia, (humains ?? []).map((h: { pseudo: string }) => h.pseudo), creerRng(`${salon.id}:ia-noms`));
    const place0 = Math.max(-1, ...(humains ?? []).map((h: { place: number }) => h.place)) + 1;
    if (ia > 0) {
      const { error: e } = await sb.from('plateforme_joueurs').insert(
        noms.map((pseudo, i) => ({ salon_id: salon.id, user_id: null, pseudo, place: place0 + i, est_ia: true })),
      );
      if (e) throw e;
    }

    const options: Record<string, unknown> = { ...salon.options };
    if (salon.jeu_code === 'loupgarou') options.fraicheur = await chargerFraicheur(sb, salon.hote_id);

    try {
      await demarrerPartie(creerDeps(sb, salon), salon.id, salon.jeu_code, salon.mode, options);
    } catch (e) {
      // retour à l'état d'avant, pour pouvoir réessayer proprement
      await sb.from('plateforme_etats').delete().eq('salon_id', salon.id);
      await sb.from('plateforme_joueurs').delete().eq('salon_id', salon.id).eq('est_ia', true);
      throw e;
    }
    await sb.from('plateforme_salons').update({ statut: 'en_cours' }).eq('id', salon.id);
    await apresTransition(sb, { ...salon, statut: 'en_cours' }); // les IA jouent leurs premières actions
  });
}
