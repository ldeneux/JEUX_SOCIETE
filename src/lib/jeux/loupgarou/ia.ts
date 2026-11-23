/**
 * IA de Ravensburg. Elle ne triche pas : elle ne regarde que le rôle du joueur, ses alliés connus
 * (meute, serviteurs, amoureux) et ce que sa Voyante a appris. Pas de pouvoir de lecture sur les autres.
 */
import type { ActionJoueur, Rng } from '../contract';
import { parCode } from './roles';
import { descripteursLG } from './deroule';
import { joueur, type EtatLG, type JoueurLG } from './etat';

function estAllie(moi: JoueurLG, x: JoueurLG): boolean {
  if (moi.id === x.id) return true;
  if (moi.camp === 'loups' && x.camp === 'loups') return true;
  const sombre = (j: JoueurLG) => j.role === 'dracula' || j.statuts.includes('corrompu');
  if (sombre(moi) && sombre(x)) return true;
  if (moi.statuts.includes('amoureux') && moi.secret.amoureuxDe === x.id) return true;
  return false;
}

export function iaLG(d: EtatLG, id: string, rng: Rng): ActionJoueur | null {
  const moi = joueur(d, id);
  if (!moi) return null;
  const desc = descripteursLG(d, moi).find((x) => x.type !== 'texte' && x.id !== 'juge');
  if (!desc) return null;
  const connus: Record<string, string> = moi.secret.connus ?? {};
  const suspect = (cid: string) => !!connus[cid] && parCode(connus[cid]).camp === 'loups';

  switch (desc.type) {
    case 'confirmer':
      return { id: desc.id, valeur: true };

    case 'texte':
      return null;

    case 'choix': {
      const valeurs = desc.options.map((o) => o.valeur);
      let v = rng.tirer(valeurs);
      if (desc.id === 'mode' && valeurs.includes('embraser')) {
        const aspergesVivants = d.joueurs.filter((x) => x.vivant && x.statuts.includes('asperge')).length;
        v = aspergesVivants >= 2 ? 'embraser' : 'asperger';
      } else if (desc.id === 'infecter') v = rng.suivant() < 0.6 ? 'oui' : 'non';
      else if (desc.id === 'carte') v = valeurs.includes('garder') && rng.suivant() < 0.5 ? 'garder' : rng.tirer(valeurs.filter((x) => x !== 'garder'));
      else if (desc.id === 'pouvoir') v = rng.tirer(valeurs.filter((x) => x !== 'rien'));
      else if (desc.id === 'servante') v = rng.suivant() < 0.5 ? 'non' : rng.tirer(valeurs.filter((x) => x !== 'non'));
      return { id: desc.id, valeur: v };
    }

    case 'joueurs': {
      const nuisible = ['vote', 'tir'].includes(desc.id) || ['corbeau', 'pyromane'].includes(moi.role);
      let cands = desc.candidats;
      if (nuisible) {
        const sansAllies = cands.filter((cid) => !estAllie(moi, joueur(d, cid)!));
        if (sansAllies.length) cands = sansAllies;
      }
      const soupconnes = cands.filter(suspect);
      const pick = (k: number) => {
        const premiers = soupconnes.length && nuisible ? [rng.tirer(soupconnes)] : [];
        const reste = rng.melanger(cands.filter((c) => !premiers.includes(c)));
        return [...premiers, ...reste].slice(0, k);
      };
      if (desc.id === 'vie') return { id: desc.id, valeur: rng.suivant() < 0.85 ? [desc.candidats[0]] : [] };
      if (desc.id === 'mort') return { id: desc.id, valeur: rng.suivant() < 0.06 && cands.length ? pick(1) : [] };
      if (desc.id === 'tir') return { id: desc.id, valeur: pick(1) };
      if (desc.min === 0) return { id: desc.id, valeur: rng.suivant() < 0.5 ? pick(1) : [] };
      return { id: desc.id, valeur: pick(Math.min(desc.max, cands.length)).slice(0, Math.max(desc.min, Math.min(desc.max, cands.length))) };
    }
  }
}
