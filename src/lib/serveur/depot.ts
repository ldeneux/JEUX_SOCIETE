import type { Evenement, Joueur } from '../jeux/contract';
import type { Depot, EtatStocke } from '../jeux/moteur';
import type { Sb } from './supabase';

/** Implémentation Supabase du dépôt d'état (jeux.plateforme_etats, jeux.plateforme_journal). */
export function creerDepot(sb: Sb): Depot {
  return {
    async charger(salonId) {
      const { data, error } = await sb.from('plateforme_etats').select('*').eq('salon_id', salonId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        jeuCode: data.jeu_code, mode: data.mode, config: data.config,
        etat: data.etat, version: data.version, echeance: data.echeance,
      } satisfies EtatStocke;
    },

    async creer(salonId, s) {
      const { error } = await sb.from('plateforme_etats').insert({
        salon_id: salonId, jeu_code: s.jeuCode, mode: s.mode, config: s.config, etat: s.etat, echeance: s.echeance,
      });
      if (error) throw error;
    },

    /** Compare-and-swap : une seule requête concurrente peut passer de la version v à v+1. */
    async sauver(salonId, versionAttendue, etat, echeance) {
      const { data, error } = await sb
        .from('plateforme_etats')
        .update({ etat, echeance, version: versionAttendue + 1, maj_le: new Date().toISOString() })
        .eq('salon_id', salonId)
        .eq('version', versionAttendue)
        .select('version');
      if (error) throw error;
      return (data?.length ?? 0) === 1;
    },

    async joueurs(salonId): Promise<Joueur[]> {
      const { data, error } = await sb.from('plateforme_joueurs').select('id,pseudo,place').eq('salon_id', salonId).order('place');
      if (error) throw error;
      return (data ?? []) as Joueur[];
    },

    async joueurDeUser(salonId, userId) {
      const { data, error } = await sb.from('plateforme_joueurs').select('id').eq('salon_id', salonId).eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },

    async journaliser(salonId, version, evenements: Evenement[]) {
      if (!evenements.length) return;
      const lignes = evenements.map((e) => ({
        salon_id: salonId, version, type: e.type, visibilite: e.visibilite.type,
        destinataires: e.visibilite.type === 'prive' ? e.visibilite.joueurs : [], donnees: e.donnees,
      }));
      const { error } = await sb.from('plateforme_journal').insert(lignes);
      if (error) console.error('journal', error.message); // le journal ne doit jamais bloquer la partie
    },
  };
}
