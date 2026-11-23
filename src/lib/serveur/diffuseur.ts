import type { VueConsole, VueJoueur } from '../jeux/contract';
import type { Diffuseur, Diffusion } from '../jeux/moteur';
import type { Sb } from './supabase';

interface Ligne { cible: string; version: number; echeance: string | null; vue: unknown }

/**
 * Diffusion = écriture de la dernière vue de chaque écran dans jeux.plateforme_vues.
 * La RLS garantit qu'un téléphone ne lit que sa ligne ; Realtime (postgres_changes) pousse les changements.
 * Tous les appels d'une même transition sont regroupés en UN seul upsert.
 */
export function creerDiffuseur(sb: Sb, hoteId: string): Diffuseur {
  const lots = new Map<string, { lignes: Ligne[]; promesse: Promise<void> }>();

  function ajouter(salonId: string, l: Ligne): Promise<void> {
    let lot = lots.get(salonId);
    if (!lot) {
      const lignes: Ligne[] = [];
      const promesse = Promise.resolve().then(async () => {
        lots.delete(salonId); // laisse tous les appels synchrones de la transition se regrouper
        const { data: joueurs, error: e1 } = await sb.from('plateforme_joueurs').select('id,user_id').eq('salon_id', salonId);
        if (e1) throw e1;
        const users = new Map((joueurs ?? []).map((j: { id: string; user_id: string }) => [j.id, j.user_id]));
        const rows = lignes.flatMap((x) => {
          const user_id = x.cible === 'console' ? hoteId : users.get(x.cible);
          return user_id ? [{ salon_id: salonId, cible: x.cible, user_id, version: x.version, echeance: x.echeance, vue: x.vue, maj_le: new Date().toISOString() }] : [];
        });
        const { error } = await sb.from('plateforme_vues').upsert(rows, { onConflict: 'salon_id,cible' });
        if (error) throw error;
      });
      lot = { lignes, promesse };
      lots.set(salonId, lot);
    }
    lot.lignes.push(l);
    return lot.promesse;
  }

  return {
    console: (salonId, d: Diffusion<VueConsole>) => ajouter(salonId, { cible: 'console', ...d }),
    joueur: (salonId, joueurId, d: Diffusion<VueJoueur>) => ajouter(salonId, { cible: joueurId, ...d }),
  };
}
