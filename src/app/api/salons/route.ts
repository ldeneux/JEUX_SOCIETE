import { obtenirModule } from '@/lib/jeux/registre';
import { ErreurHttp } from '@/lib/serveur/supabase';
import { repondre, sbService, utilisateur } from '@/lib/serveur/api';

export const dynamic = 'force-dynamic';

/** Crée un salon (console de l'hôte). Body : { jeu, mode, options? } */
export async function POST(req: Request) {
  return repondre(async () => {
    const sb = sbService();
    const user = await utilisateur(req, sb);
    const { jeu, mode, options } = await req.json();
    let mod;
    try { mod = obtenirModule(String(jeu)); } catch { throw new ErreurHttp(400, 'Jeu indisponible'); }
    if (!mod.manifeste.modes.some((m) => m.code === mode)) throw new ErreurHttp(400, 'Mode inconnu');
    mod.configSchema.parse(options ?? {}); // échoue tôt si les options sont invalides
    const ia = options?.ia ?? 0;
    if (!(Number.isInteger(ia) && ia >= 0 && ia <= mod.manifeste.joueurs.max)) throw new ErreurHttp(400, 'Nombre de joueurs IA invalide');

    for (let essai = 0; essai < 5; essai++) {
      const { data, error } = await sb
        .from('plateforme_salons')
        .insert({ jeu_code: jeu, hote_id: user.id, mode, options: options ?? {} })
        .select('code')
        .single();
      if (!error) return { code: data.code };
      if (error.code !== '23505') throw error; // 23505 = collision de code, on retente
    }
    throw new ErreurHttp(500, 'Impossible de générer un code de salon');
  });
}
