import { tick } from '@/lib/jeux/moteur';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { creerDeps, estMembre, finaliserSiBesoin, repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Fait avancer la partie si l'échéance est dépassée. Idempotent : appelé par la console (et par le cron). */
export async function POST(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    if (!(await estMembre(sb, salon, user.id))) throw new ErreurHttp(403, 'Accès refusé');
    const avance = await tick(creerDeps(sb, salon), salon.id);
    if (avance) {
      const { data } = await sb.from('plateforme_etats').select('etat').eq('salon_id', salon.id).maybeSingle();
      if (data) await finaliserSiBesoin(sb, salon, data.etat);
    }
    return { avance };
  });
}
