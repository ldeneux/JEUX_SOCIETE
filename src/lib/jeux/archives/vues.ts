import type { VueConsole, VueJoueur } from '../contract';
import { CATEGORIES, CARTES_PAR_CAT, NOEUD_PAR_ID, NOEUDS, PERSO_PAR_CODE } from './donnees';
import { descripteursAR, joueur, joueurActif, nomCarte, type EtatAR, type JoueurAR } from './regles';

export interface LigneCarnet { id: string; nom: string; statut: 'main' | 'montree' | 'innocente' | 'inconnue'; detail?: string }

/** Carnet d'enquête automatique : uniquement des faits que ce joueur connaît réellement. */
export function carnetDe(d: EtatAR, p: JoueurAR) {
  return CATEGORIES.map(({ cat, titre }) => ({
    cat,
    titre,
    cartes: CARTES_PAR_CAT[cat].map((k): LigneCarnet => {
      if (p.main.includes(k.id)) return { id: k.id, nom: k.nom, statut: 'main' };
      const detenteur = p.montrees[k.id];
      if (detenteur) return { id: k.id, nom: k.nom, statut: 'montree', detail: joueur(d, detenteur)?.pseudo };
      if (p.innocentes.includes(k.id)) return { id: k.id, nom: k.nom, statut: 'innocente' };
      return { id: k.id, nom: k.nom, statut: 'inconnue' };
    }),
  }));
}

const TITRES_ETAPE: Record<string, string> = {
  pouvoir: 'Pouvoir spécial', raccourci: 'Raccourci temporel', detection: 'Détection d’anomalie', deplacement: 'À toi d’enquêter',
  hypothese: 'Une hypothèse ?', h_suspect: 'Ton hypothèse', h_artefact: 'Ton hypothèse', h_mobile: 'Ton hypothèse',
  fin: 'Fin de ton tour', a_suspect: 'Ton accusation', a_artefact: 'Ton accusation', a_lieu: 'Ton accusation', a_mobile: 'Ton accusation',
};

export function vueJoueurAR(d: EtatAR, id: string): VueJoueur {
  const j = joueur(d, id);
  if (!j) throw new Error('Joueur inconnu');
  const perso = PERSO_PAR_CODE[j.perso];
  const actions = descripteursAR(d, j);
  const base = {
    carte: { code: j.perso, nom: perso.nom },
    secrets: [{ libelle: 'Mes cartes', valeur: j.main.map(nomCarte).join('\n') }, ...j.infos],
    donnees: {
      carnet: carnetDe(d, j),
      alternatives: j.alternatives.map((a) => `${nomCarte(a.a)} ou ${nomCarte(a.b)}`),
      position: NOEUD_PAR_ID[j.noeud].nom,
      pouvoir: `${perso.pouvoir} : ${perso.resume}`,
    },
  };

  if (d.phase === 'fin') {
    const gagne = d.vainqueur!.vainqueurs.includes(id);
    return {
      ...base, ecran: 'fin', titre: d.vainqueur!.titre, actions: [],
      message: `${d.vainqueur!.histoire}\n${d.vainqueur!.vainqueurs.length ? (gagne ? 'Victoire !' : 'Une autre enquêtrice a vu juste.') : 'Personne n’a trouvé la solution.'}`,
    };
  }
  if (d.phase === 'refutation' && actions.length) {
    const h = d.hypCourante!;
    return {
      ...base, ecran: 'action', titre: 'Réfute l’hypothèse', actions,
      message: `${joueur(d, h.auteur)!.pseudo} suspecte ${nomCarte(h.suspect)}, avec ${nomCarte(h.artefact)}, à ${nomCarte(h.lieu)}, par ${nomCarte(h.mobile).toLowerCase()}.`,
    };
  }
  if (actions.length) return { ...base, ecran: 'action', titre: TITRES_ETAPE[d.etape] ?? 'À toi', actions };

  const actif = joueurActif(d);
  const recent = d.journal.slice(-4).join('\n');
  return {
    ...base,
    ecran: 'attente',
    titre: j.elimine ? 'Tu es écarté(e) de l’enquête' : d.phase === 'refutation' ? 'Réfutation en cours…' : `Tour de ${actif.pseudo}`,
    message: j.elimine ? `Tes cartes servent encore à réfuter.\n${recent}` : recent,
    actions: [],
  };
}

export function vueConsoleAR(d: EtatAR): VueConsole {
  const actif = d.phase === 'fin' ? null : joueurActif(d);
  const h = d.hypCourante;
  const fin = d.phase === 'fin';
  return {
    ecran: d.phase,
    titre: fin ? d.vainqueur!.titre : d.phase === 'refutation' ? 'Réfutation en cours' : `Manche ${d.manche} · tour de ${actif!.pseudo}`,
    narration: d.narration,
    joueurs: d.joueurs.map((j) => ({
      id: j.id, pseudo: j.pseudo, place: j.place, vivant: !j.elimine,
      badges: [PERSO_PAR_CODE[j.perso].nom, j.elimine ? 'écarté' : '', fin && j.ia ? '🤖' : ''].filter(Boolean),
    })),
    donnees: {
      noeuds: NOEUDS.map((n) => ({ id: n.id, nom: n.nom, type: n.type, x: n.x, y: n.y, epoque: n.epoque, ferme: d.fermes.includes(n.id) })),
      pions: d.joueurs.map((j) => ({ id: j.id, pseudo: j.pseudo, perso: j.perso, noeud: j.noeud, elimine: j.elimine })),
      actif: actif?.id ?? null,
      manche: d.manche,
      toursMax: d.toursMax,
      etape: d.etape,
      journal: d.journal.slice(-14),
      hypothese: h && {
        auteur: joueur(d, h.auteur)!.pseudo, suspect: nomCarte(h.suspect), artefact: nomCarte(h.artefact),
        lieu: nomCarte(h.lieu), mobile: nomCarte(h.mobile), refutePar: h.refutePar ? joueur(d, h.refutePar)!.pseudo : null,
        resolue: d.phase !== 'refutation',
      },
      solution: fin
        ? Object.fromEntries((['suspect', 'artefact', 'lieu', 'mobile'] as const).map((k) => [k, { id: d.solution[k], nom: nomCarte(d.solution[k]) }]))
        : null,
      histoire: fin ? d.vainqueur!.histoire : null,
      vainqueurs: fin ? d.vainqueur!.vainqueurs : [],
      roles: fin ? d.joueurs.map((j) => ({ id: j.id, role: j.perso, nom: PERSO_PAR_CODE[j.perso].nom })) : [],
    },
  };
}
