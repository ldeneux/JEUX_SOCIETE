import { CATALOGUE } from '../jeux/loupgarou/roles';
import type { Sb } from './supabase';

/** Fraîcheur = nombre de parties écoulées depuis la dernière apparition du rôle (plafonnée à 10). */
export async function chargerFraicheur(sb: Sb, userId: string): Promise<Record<string, number>> {
  const { data } = await sb.from('loupgarou_fraicheur').select('role_code,parties_depuis').eq('user_id', userId);
  return Object.fromEntries((data ?? []).map((r: { role_code: string; parties_depuis: number }) => [r.role_code, r.parties_depuis]));
}

export async function mettreAJourFraicheur(sb: Sb, userId: string, rolesJoues: string[]) {
  const avant = await chargerFraicheur(sb, userId);
  const joues = new Set(rolesJoues);
  const lignes = CATALOGUE.map((r) => ({
    user_id: userId, role_code: r.code,
    parties_depuis: joues.has(r.code) ? 0 : Math.min((avant[r.code] ?? 5) + 1, 10),
  }));
  const { error } = await sb.from('loupgarou_fraicheur').upsert(lignes, { onConflict: 'user_id,role_code' });
  if (error) console.error('fraicheur', error.message);
}
