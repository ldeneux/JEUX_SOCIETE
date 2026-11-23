import { vuePourConsole, vuePourJoueur } from '@/lib/jeux/moteur';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { creerDeps, estMembre, repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';

/** Vue courante (reconnexion, polling de secours). ?cible=console pour l'hôte, sinon vue de joueur. */
export async function GET(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    if (!(await estMembre(sb, salon, user.id))) throw new ErreurHttp(403, 'Accès refusé');
    const deps = creerDeps(sb, salon);
    const modeConsole = new URL(req.url).searchParams.get('cible') === 'console';
    if (modeConsole && salon.hote_id !== user.id) throw new ErreurHttp(403, 'Réservé à l’hôte');

    const stocke = await deps.depot.charger(salon.id);
    if (!stocke || !stocke.etat) return { statut: salon.statut, version: 0, echeance: null, vue: null };
    const r = modeConsole ? await vuePourConsole(deps, salon.id) : await vuePourJoueur(deps, salon.id, user.id);
    return { statut: salon.statut, ...r };
  });
}
