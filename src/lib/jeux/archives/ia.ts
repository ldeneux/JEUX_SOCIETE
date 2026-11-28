/**
 * IA d'enquêteur. Elle ne triche pas : elle raisonne uniquement sur ses cartes, ce qu'on lui a montré,
 * ses indices, et l'historique PUBLIC des hypothèses (qui a tenté quoi, qui a réfuté).
 */
import type { ActionJoueur, Rng } from '../contract';
import { CARTES_PAR_CAT, CATEGORIES, NOEUD_PAR_ID, distances, type Categorie } from './donnees';
import { descripteursAR, joueur, type EtatAR, type JoueurAR } from './regles';

/** Cartes encore possibles dans la solution pour une catégorie, selon ce que ce joueur sait. */
export function candidats(d: EtatAR, p: JoueurAR, cat: Categorie): string[] {
  // Une hypothèse personnelle que personne n'a pu réfuter : ce qui n'est pas dans ma main est dans la solution.
  for (const h of d.hypotheses) {
    if (h.auteur === p.id && h.refutePar === null && !p.main.includes(h[cat])) return [h[cat]];
  }
  let base = CARTES_PAR_CAT[cat].map((k) => k.id).filter((id) => !p.innocentes.includes(id));
  for (const alt of p.alternatives.filter((x) => x.cat === cat)) {
    const r = base.filter((id) => id === alt.a || id === alt.b);
    if (r.length) base = r;
  }
  return base.length ? base : CARTES_PAR_CAT[cat].map((k) => k.id);
}

export function iaAR(d: EtatAR, id: string, rng: Rng): ActionJoueur | null {
  const p = joueur(d, id);
  if (!p) return null;
  const desc = descripteursAR(d, p)[0];
  if (!desc || desc.type !== 'choix') return null;
  const valeurs = desc.options.map((o) => o.valeur);
  const rep = (valeur: string): ActionJoueur => ({ id: desc.id, valeur });
  const pick = (cat: Categorie) => rng.tirer(candidats(d, p, cat));
  const certain = () => CATEGORIES.every((x) => candidats(d, p, x.cat).length === 1);

  switch (desc.id) {
    case 'pouvoir': {
      if (p.perso === 'agent_temporel') return rep('oui');
      const pnjLibre = Object.values(NOEUD_PAR_ID).some((n) => n.pnj && !p.vusPNJ.includes(n.pnj));
      return rep(pnjLibre && d.manche >= 2 && rng.suivant() < 0.5 ? 'oui' : 'non');
    }
    case 'categorie': {
      let meilleure: Categorie = 'artefact';
      let max = -1;
      for (const x of CATEGORIES) {
        const n = candidats(d, p, x.cat).length;
        if (n > max) { max = n; meilleure = x.cat; }
      }
      return rep(meilleure);
    }
    case 'dest': {
      const dist = distances(p.noeud, d.fermes);
      const lieuxPossibles = candidats(d, p, 'lieu');
      let meilleur = valeurs[0];
      let score = -Infinity;
      for (const v of valeurs) {
        const n = NOEUD_PAR_ID[v];
        let s = rng.suivant() * 2 - (dist.get(v) ?? 0) * 0.2;
        if (n.type === 'secondaire') s += p.vusPNJ.includes(n.pnj!) ? -3 : 8;
        else {
          if (n.pnj && !p.vusPNJ.includes(n.pnj)) s += 1.5;
          s += lieuxPossibles.includes(v) ? 6 : 1;
          s -= 1.5 * d.hypotheses.filter((h) => h.auteur === p.id && h.lieu === v).length;
        }
        if (s > score) { score = s; meilleur = v; }
      }
      return rep(meilleur);
    }
    case 'hypothese': return rep(valeurs.includes('pnj') && rng.suivant() < 0.4 ? 'pnj' : 'oui');
    case 'suspect': return rep(pick('suspect'));
    case 'artefact': return rep(pick('artefact'));
    case 'mobile': return rep(pick('mobile'));
    case 'fin':
      return rep(certain() || d.manche >= d.toursMax ? 'accuser' : 'terminer');
    case 'a_suspect': return rep(pick('suspect'));
    case 'a_artefact': return rep(pick('artefact'));
    case 'a_lieu': return rep(pick('lieu'));
    case 'a_mobile': return rep(pick('mobile'));
    case 'montrer': {
      const auteur = joueur(d, d.hypCourante!.auteur)!;
      const dejaVues = valeurs.filter((v) => auteur.montrees[v] === p.id); // montrer deux fois la même carte ne révèle rien de plus
      return rep(rng.tirer(dejaVues.length ? dejaVues : valeurs));
    }
  }
  return rep(rng.tirer(valeurs));
}
