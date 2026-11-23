import { tick } from '@/lib/jeux/moteur';
import { creerDeps, finaliserSiBesoin, repondre, sbService, type Salon } from '@/lib/serveur/api';
import { ErreurHttp } from '@/lib/serveur/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Filet de sécurité : fait avancer les parties dont l'échéance est dépassée (console déconnectée).
 * À appeler chaque minute depuis un planificateur externe (voir README) avec  Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  return repondre(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) throw new ErreurHttp(401, 'Non autorisé');
    const sb = sbService();
    const { data } = await sb.from('plateforme_etats').select('salon_id').lt('echeance', new Date().toISOString()).limit(50);
    let avances = 0;
    for (const { salon_id } of data ?? []) {
      const { data: salon } = await sb.from('plateforme_salons').select('*').eq('id', salon_id).maybeSingle();
      if (!salon || salon.statut !== 'en_cours') continue;
      if (await tick(creerDeps(sb, salon as Salon), salon_id)) {
        avances++;
        const { data: e } = await sb.from('plateforme_etats').select('etat').eq('salon_id', salon_id).maybeSingle();
        if (e) await finaliserSiBesoin(sb, salon as Salon, e.etat);
      }
    }
    return { avances };
  });
}
