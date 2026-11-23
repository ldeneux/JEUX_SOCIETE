import { obtenirModule } from '@/lib/jeux/registre';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { repondre, salonParCode, sbService, utilisateur, type Params } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';

/** Un téléphone rejoint le salon. Body : { pseudo } */
export async function POST(req: Request, { params }: Params) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const salon = await salonParCode(sb, (await params).code);
    const pseudo = String((await req.json()).pseudo ?? '').trim().replace(/\s+/g, ' ');
    if (pseudo.length < 2 || pseudo.length > 16) throw new ErreurHttp(400, 'Pseudo : 2 à 16 caractères');

    const { data: joueurs, error } = await sb.from('plateforme_joueurs').select('id,user_id,place').eq('salon_id', salon.id);
    if (error) throw error;
    if (joueurs?.some((j: { user_id: string }) => j.user_id === user.id)) return { code: salon.code, deja: true }; // reconnexion
    if (salon.statut !== 'attente') throw new ErreurHttp(409, 'La partie a déjà commencé');

    const max = obtenirModule(salon.jeu_code).manifeste.joueurs.max;
    // Les humains sont prioritaires : une place réservée à une IA est reprise par l'humain qui arrive.
    if ((joueurs?.length ?? 0) >= max) throw new ErreurHttp(409, `Salon complet (${max} joueurs)`);
    const place = Math.max(-1, ...(joueurs ?? []).map((j: { place: number }) => j.place)) + 1;

    const { error: e2 } = await sb.from('plateforme_joueurs').insert({ salon_id: salon.id, user_id: user.id, pseudo, place });
    if (e2?.code === '23505') throw new ErreurHttp(409, 'Ce pseudo est déjà pris dans ce salon');
    if (e2) throw e2;
    return { code: salon.code };
  });
}
