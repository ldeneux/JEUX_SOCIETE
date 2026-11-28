import type { VueConsole, VueJoueur } from '../contract';
import { CATEGORIES, CARTES_PAR_CAT, NOEUD_PAR_ID, NOEUDS, PERSO_PAR_CODE, PNJS, pnjDe } from './donnees';
import { descripteursAR, destinations, joueur, joueurActif, nomCarte, type EtatAR, type JoueurAR } from './regles';

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

/** Données privées du téléphone : carnet, plateau, PNJ et ce que ce joueur peut faire sur la carte. Aucune solution ici. */
function donneesJoueur(d: EtatAR, j: JoueurAR, perso: (typeof PERSO_PAR_CODE)[string]) {
  const actif = d.phase === 'fin' ? null : joueurActif(d);
  const monTour = !!actif && actif.id === j.id && !j.elimine && d.phase === 'tour';
  const peutBouger = monTour && (d.etape === 'deplacement' || d.etape === 'raccourci');
  const dests: Record<string, number> = {};
  if (peutBouger) {
    if (d.etape === 'raccourci') for (const n of NOEUDS) { if (n.id !== j.noeud && !d.fermes.includes(n.id)) dests[n.id] = 0; }
    else for (const { n, dist } of destinations(d, j)) dests[n.id] = dist;
  }
  return {
    carnet: carnetDe(d, j),
    alternatives: j.alternatives.map((a) => `${nomCarte(a.a)} ou ${nomCarte(a.b)}`),
    position: NOEUD_PAR_ID[j.noeud].nom,
    positionId: j.noeud,
    pouvoir: `${perso.pouvoir} : ${perso.resume}`,
    pouvoirUtilise: j.pouvoirUtilise,
    manche: d.manche,
    toursMax: d.toursMax,
    etape: d.etape,
    monTour,
    actif: actif ? { id: actif.id, pseudo: actif.pseudo } : null,
    nbCartes: j.main.length,
    dialogue: monTour && d.etape === 'pnj_dialogue' && pnjDe(j.noeud)
      ? { code: pnjDe(j.noeud)!.code, nom: pnjDe(j.noeud)!.nom, role: pnjDe(j.noeud)!.role, parole: pnjDe(j.noeud)!.parole, confiance: pnjDe(j.noeud)!.confiance, specialite: pnjDe(j.noeud)!.specialite ?? null, lieu: NOEUD_PAR_ID[j.noeud].nom }
      : null,
    pnjDernier: j.pnjDernier ?? null,
    narration: d.narration,
    chronique: d.journal.slice(-8),
    hypotheses: d.hypotheses.slice(-6).reverse().map((h) => ({
      manche: h.manche,
      auteur: d.joueurs.find((x) => x.id === h.auteur)?.pseudo ?? '?',
      cartes: [['suspect', h.suspect], ['artefact', h.artefact], ['lieu', h.lieu], ['mobile', h.mobile]].map(([cat, id]) => ({ cat, id, nom: nomCarte(id) })),
      refute: h.refutePar ? d.joueurs.find((x) => x.id === h.refutePar)?.pseudo ?? '?' : null,
    })),
    dests,
    destsMode: d.etape === 'raccourci' ? 'raccourci' : 'pas',
    noeuds: NOEUDS.map((n) => ({
      id: n.id, nom: n.nom, type: n.type, x: n.x, y: n.y, region: n.region, epoque: n.epoque, role: n.role, ferme: d.fermes.includes(n.id),
      visite: j.lieuxVisites.includes(n.id), pnj: n.pnj ?? null,
    })),
    pions: d.joueurs.map((p) => ({ id: p.id, pseudo: p.pseudo, perso: p.perso, noeud: p.noeud, elimine: p.elimine, moi: p.id === j.id })),
    pnj: PNJS.map((p) => {
      const site = NOEUDS.find((n) => n.pnj === p.code);
      return { code: p.code, nom: p.nom, role: p.role, confiance: p.confiance, specialite: p.specialite ?? null, noeud: site?.id ?? null, lieu: site?.nom ?? null, vu: j.vusPNJ.includes(p.code), ici: pnjDe(j.noeud)?.code === p.code };
    }),
  };
}

export function vueJoueurAR(d: EtatAR, id: string): VueJoueur {
  const j = joueur(d, id);
  if (!j) throw new Error('Joueur inconnu');
  const perso = PERSO_PAR_CODE[j.perso];
  const actions = descripteursAR(d, j);
  const base = {
    carte: { code: j.perso, nom: perso.nom },
    secrets: [{ libelle: 'Mes cartes', valeur: j.main.map(nomCarte).join('\n') }, ...j.infos],
    donnees: donneesJoueur(d, j, perso),
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
      noeuds: NOEUDS.map((n) => ({ id: n.id, nom: n.nom, type: n.type, x: n.x, y: n.y, epoque: n.epoque, ferme: d.fermes.includes(n.id), pnj: n.pnj ?? null })),
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
