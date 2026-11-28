import { tick } from '@/lib/jeux/moteur';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { apresTransition, creerDeps, estMembre, repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Fait avancer la partie si l'échéance est dépassée. Idempotent : appelé par la console (et par le cron). */
export async function POST(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    if (!(await estMembre(sb, salon, user.id))) throw new ErreurHttp(403, 'Accès refusé');
    const avance = await tick(creerDeps(sb, salon), salon.id);
    await apresTransition(sb, salon);
    return { avance };
  });
}
