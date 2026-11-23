import { obtenirModule } from '@/lib/jeux/registre';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';

/** Modifie le mode / les options tant que la partie n'a pas démarré (hôte uniquement). */
export async function PATCH(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    if (salon.hote_id !== user.id) throw new ErreurHttp(403, 'Réservé à l’hôte');
    if (salon.statut !== 'attente') throw new ErreurHttp(409, 'La partie a déjà commencé');
    const { mode, options } = await req.json();
    const mod = obtenirModule(salon.jeu_code);
    if (mode && !mod.manifeste.modes.some((m) => m.code === mode)) throw new ErreurHttp(400, 'Mode inconnu');
    if (options) mod.configSchema.parse(options);
    const { error } = await sb.from('plateforme_salons').update({ ...(mode && { mode }), ...(options && { options }) }).eq('id', salon.id);
    if (error) throw error;
  });
}
