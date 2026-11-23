import { ZodError } from 'zod';
import { ErreurJeu, jouerIA } from '../jeux/moteur';
import { obtenirModule } from '../jeux/registre';
import { creerDepot } from './depot';
import { creerDiffuseur } from './diffuseur';
import { ErreurHttp, sbService, type Sb } from './supabase';
import { mettreAJourFraicheur } from './fraicheur';

export type Params = { params: Promise<{ code: string }> };

/** Enveloppe commune : conversion des erreurs en réponses JSON propres. */
export async function repondre(f: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json((await f()) ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof ErreurHttp) return Response.json({ erreur: e.message }, { status: e.statut });
    if (e instanceof ErreurJeu) {
      const statut = { introuvable: 404, interdit: 403, invalide: 400, conflit: 409 }[e.code];
      return Response.json({ erreur: e.message }, { status: statut });
    }
    if (e instanceof ZodError) return Response.json({ erreur: 'Options invalides', details: e.issues }, { status: 400 });
    console.error(e);
    return Response.json({ erreur: 'Erreur serveur' }, { status: 500 });
  }
}

export async function utilisateur(req: Request, sb: Sb) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ErreurHttp(401, 'Non connecté');
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new ErreurHttp(401, 'Session invalide');
  return data.user;
}

export interface Salon {
  id: string; code: string; jeu_code: string; hote_id: string; mode: string;
  options: Record<string, unknown>; statut: 'attente' | 'en_cours' | 'terminee' | 'abandonnee';
}

export async function salonParCode(sb: Sb, code: string): Promise<Salon> {
  const { data, error } = await sb.from('plateforme_salons').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErreurHttp(404, 'Salon introuvable');
  return data as Salon;
}

export async function estMembre(sb: Sb, salon: Salon, userId: string): Promise<boolean> {
  if (salon.hote_id === userId) return true;
  const { data } = await sb.from('plateforme_joueurs').select('id').eq('salon_id', salon.id).eq('user_id', userId).maybeSingle();
  return !!data;
}

export function creerDeps(sb: Sb, salon: Salon) {
  return { depot: creerDepot(sb), diffuseur: creerDiffuseur(sb, salon.hote_id) };
}

/** Si la partie vient de se terminer : statut du salon + mise à jour de la fraîcheur des rôles. */
export async function finaliserSiBesoin(sb: Sb, salon: Salon, etat: unknown) {
  if (salon.statut !== 'en_cours') return;
  const fin = obtenirModule(salon.jeu_code).resultat(etat);
  if (!fin) return;
  await sb.from('plateforme_salons').update({ statut: 'terminee' }).eq('id', salon.id);
  if (salon.jeu_code === 'loupgarou') {
    const roles = ((fin.stats.roles ?? []) as { role: string }[]).map((r) => r.role);
    await mettreAJourFraicheur(sb, salon.hote_id, roles);
  }
}

/**
 * À appeler après chaque démarrage / action / tick : fait jouer les IA, puis, si la partie est finie,
 * met à jour le salon et la fraîcheur des rôles.
 */
export async function apresTransition(sb: Sb, salon: Salon) {
  await jouerIA(creerDeps(sb, salon), salon.id);
  const { data } = await sb.from('plateforme_etats').select('etat').eq('salon_id', salon.id).maybeSingle();
  if (data?.etat) await finaliserSiBesoin(sb, salon, data.etat);
}

/** Nombre de joueurs IA demandé (options.ia), borné. */
export function nbIA(options: Record<string, unknown> | undefined, max: number): number {
  const n = Math.floor(Number(options?.ia ?? 0));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
}

export { sbService };
