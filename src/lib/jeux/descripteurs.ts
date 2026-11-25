import type { Descripteur, Validation } from './contract';

/** Valide la valeur renvoyée par un téléphone contre le descripteur que le serveur lui avait proposé. */
export function validerValeur(desc: Descripteur, v: unknown): Validation {
  const ko = (raison: string): Validation => ({ ok: false, raison });
  switch (desc.type) {
    case 'joueurs': {
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) return ko('Format invalide');
      if (new Set(v).size !== v.length) return ko('Doublon');
      if (v.length < desc.min || v.length > desc.max) return ko(`Choisis entre ${desc.min} et ${desc.max} joueur(s)`);
      return v.every((x) => desc.candidats.includes(x)) ? { ok: true } : ko('Cible interdite');
    }
    case 'choix':
      return typeof v === 'string' && desc.options.some((o) => o.valeur === v) ? { ok: true } : ko('Choix invalide');
    case 'confirmer':
      return v === true ? { ok: true } : ko('Confirmation attendue');
    case 'texte':
      return typeof v === 'string' && v.trim().length > 0 && v.length <= desc.maxLongueur ? { ok: true } : ko('Texte invalide');
  }
}
