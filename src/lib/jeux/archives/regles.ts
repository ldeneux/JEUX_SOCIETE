/**
 * RÈGLES DE « CLUEDO : LES ARCHIVES DU TEMPS ».
 * Un artefact a disparu : une solution cachée (suspect + artefact + lieu + mobile), le reste des cartes est distribué.
 * Tour : [pouvoir] → déplacement → [hypothèse sur un lieu → réfutation privée] → terminer ou accuser.
 * Fonctions mutantes sur un Ctx (l'état est cloné par index.ts avant chaque appel).
 */
import type { ActionJoueur, Attente, Descripteur, Evenement, Joueur, JoueurId, Rng, Transition, Validation } from '../contract';
import { validerValeur } from '../descripteurs';
import type { Config } from './config';
import {
  CARTE_PAR_ID, CARTES, CARTES_PAR_CAT, CATEGORIES, DEPART, LIEUX, NOEUD_PAR_ID, NOEUDS, PERSOS, PERSO_PAR_CODE, distances, pnjDe,
  type Categorie,
} from './donnees';

export interface Info { libelle: string; valeur: string }

export interface JoueurAR {
  id: JoueurId;
  pseudo: string;
  place: number;
  ia?: boolean;
  perso: string;
  noeud: string;
  main: string[];
  elimine: boolean;
  /** Cartes que ce joueur SAIT ne pas être dans la solution (sa main, cartes vues, indices). */
  innocentes: string[];
  /** Cartes qu'on lui a montrées : carte → joueur qui la détient. */
  montrees: Record<string, JoueurId>;
  alternatives: { cat: Categorie; a: string; b: string }[];
  vusPNJ: string[];
  lieuxVisites: string[];
  pouvoirUtilise: boolean;
  infos: Info[];
}

export type Etape =
  | 'pouvoir' | 'raccourci' | 'detection' | 'deplacement' | 'hypothese' | 'h_suspect' | 'h_artefact' | 'h_mobile'
  | 'fin' | 'a_suspect' | 'a_artefact' | 'a_lieu' | 'a_mobile';

export interface Solution { suspect: string; artefact: string; lieu: string; mobile: string }

export interface Hypothese extends Solution { auteur: JoueurId; refutePar: JoueurId | null; manche: number }

export interface EtatAR {
  phase: 'tour' | 'refutation' | 'fin';
  manche: number;
  toursMax: number;
  premier: number; // index du premier joueur : une manche = un tour de table depuis lui
  actif: number; // index dans `ordre`
  ordre: JoueurId[];
  joueurs: JoueurAR[];
  solution: Solution;
  etape: Etape;
  brouillon: Record<string, string>;
  refutation: { refuter: JoueurId; options: string[] } | null;
  fermes: string[];
  journal: string[];
  narration: string;
  hypotheses: Hypothese[];
  hypCourante: Hypothese | null;
  vainqueur: { titre: string; vainqueurs: JoueurId[]; histoire: string } | null;
  mode: string;
  config: Config;
}

export interface Ctx { d: EtatAR; ev: Evenement[]; rng: Rng }

// ------------------------------------------------------------------ Helpers

export const joueur = (d: EtatAR, id: JoueurId | null | undefined) => d.joueurs.find((j) => j.id === id);
export const joueurActif = (d: EtatAR) => joueur(d, d.ordre[d.actif])!;
export const nomCarte = (id: string) => CARTE_PAR_ID[id]?.nom ?? id;
const nomNoeud = (id: string) => NOEUD_PAR_ID[id].nom;
const pasDe = (d: EtatAR, p: JoueurAR) => d.config.pas + (p.perso === 'explorateur' ? 1 : 0);
const aPouvoirActif = (p: JoueurAR) => (p.perso === 'cartographe' || p.perso === 'agent_temporel') && !p.pouvoirUtilise;
const cartesDeLHypothese = (h: Solution) => [h.suspect, h.artefact, h.lieu, h.mobile];

export function log(c: Ctx, texte: string, narrer = true) {
  c.d.journal.push(texte);
  if (c.d.journal.length > 40) c.d.journal.shift();
  if (narrer) c.d.narration = texte;
  c.ev.push({ type: 'journal', visibilite: { type: 'public' }, donnees: { texte } });
}

function info(c: Ctx, p: JoueurAR, libelle: string, valeur: string) {
  p.infos.push({ libelle, valeur });
  if (p.infos.length > 25) p.infos.shift();
  c.ev.push({ type: 'info', visibilite: { type: 'prive', joueurs: [p.id] }, donnees: { libelle, valeur } });
}

const apprendreInnocente = (p: JoueurAR, id: string) => { if (!p.innocentes.includes(id)) p.innocentes.push(id); };

// ------------------------------------------------------------------ Indices (toujours véridiques)

/** Donne un indice vrai à `p` : « cette carte n'est pas la solution », ou « A ou B » dont l'un est la solution. */
function genererIndice(c: Ctx, p: JoueurAR, source: string, categorie?: Categorie, forcerAlternative = false): boolean {
  const { d, rng } = c;
  const sol = d.solution;
  const solIds = cartesDeLHypothese(sol);
  const inconnues = (cat?: Categorie) => CARTES.filter((k) => !solIds.includes(k.id) && !p.innocentes.includes(k.id) && (!cat || k.cat === cat));

  if ((!categorie || forcerAlternative) && (forcerAlternative || rng.suivant() < 0.4)) {
    const cat = categorie ?? rng.tirer(CATEGORIES).cat;
    const vrai = sol[cat];
    const autres = inconnues(cat);
    if (autres.length) {
      const faux = rng.tirer(autres).id;
      const [a, b] = rng.melanger([vrai, faux]);
      p.alternatives.push({ cat, a, b });
      info(c, p, source, `« ${CATEGORIES.find((x) => x.cat === cat)!.article} est ${nomCarte(a)}, ou bien ${nomCarte(b)}. »`);
      return true;
    }
  }
  const pool = inconnues(categorie);
  if (!pool.length) {
    info(c, p, source, categorie ? 'Rien d’anormal à signaler dans cette catégorie.' : '« Je n’ai plus rien à vous apprendre. »');
    return false;
  }
  const k = rng.tirer(pool);
  apprendreInnocente(p, k.id);
  info(c, p, source, `« ${k.nom} n’a rien à voir avec cette affaire. »`);
  return true;
}

// ------------------------------------------------------------------ Création de la partie

export function creerEtat(joueurs: Joueur[], mode: string, config: Config, rng: Rng): Transition<EtatAR> {
  const tries = [...joueurs].sort((a, b) => a.place - b.place);
  const humainsDabord = [...tries.filter((j) => !j.ia), ...tries.filter((j) => j.ia)];
  const persos = rng.melanger(PERSOS);
  const persoDe = new Map(humainsDabord.map((j, i) => [j.id, persos[i].code]));

  const solution: Solution = {
    suspect: rng.tirer(CARTES_PAR_CAT.suspect).id,
    artefact: rng.tirer(CARTES_PAR_CAT.artefact).id,
    lieu: rng.tirer(CARTES_PAR_CAT.lieu).id,
    mobile: rng.tirer(CARTES_PAR_CAT.mobile).id,
  };
  const reste = rng.melanger(CARTES.filter((k) => !cartesDeLHypothese(solution).includes(k.id)));
  const depart = rng.entier(tries.length);

  const d: EtatAR = {
    phase: 'tour',
    manche: 1,
    toursMax: mode === 'course' ? Math.min(12, config.toursMax) : config.toursMax,
    premier: depart,
    actif: depart,
    ordre: tries.map((j) => j.id),
    joueurs: tries.map((j) => ({
      id: j.id, pseudo: j.pseudo, place: j.place, ia: !!j.ia, perso: persoDe.get(j.id)!, noeud: DEPART, main: [],
      elimine: false, innocentes: [], montrees: {}, alternatives: [], vusPNJ: [], lieuxVisites: [], pouvoirUtilise: false, infos: [],
    })),
    solution,
    etape: 'deplacement',
    brouillon: {},
    refutation: null,
    fermes: [],
    journal: [],
    narration: '',
    hypotheses: [],
    hypCourante: null,
    vainqueur: null,
    mode,
    config,
  };
  reste.forEach((k, i) => d.joueurs[(i + depart) % d.joueurs.length].main.push(k.id));
  for (const p of d.joueurs) p.innocentes = [...p.main];

  const c: Ctx = { d, ev: [], rng };
  log(c, 'Un artefact a disparu des Archives du Temps. L’enquête commence.');
  const conservateur = d.joueurs.find((p) => p.perso === 'conservateur');
  if (conservateur) genererIndice(c, conservateur, 'Inventaire', 'artefact');
  const collectionneur = d.joueurs.find((p) => p.perso === 'collectionneur');
  if (collectionneur) genererIndice(c, collectionneur, 'Cabinet de curiosités', 'mobile');
  evenementManche(c);
  debutTour(c);
  return { etat: c.d, evenements: c.ev };
}

// ------------------------------------------------------------------ Déroulé des tours

function debutTour(c: Ctx) {
  const { d } = c;
  const p = joueurActif(d);
  d.brouillon = {};
  d.refutation = null;
  d.hypCourante = null;
  d.etape = aPouvoirActif(p) ? 'pouvoir' : 'deplacement';
  log(c, `Manche ${d.manche} : ${p.pseudo}, ${PERSO_PAR_CODE[p.perso].nom.toLowerCase()}, mène l’enquête.`);
}

function evenementManche(c: Ctx) {
  const { d, rng } = c;
  d.fermes = [];
  if (d.mode !== 'vivantes') return;
  const tirage = rng.suivant();
  if (tirage < 0.4) {
    const libres = LIEUX.filter((l) => !d.joueurs.some((p) => p.noeud === l.id));
    if (libres.length) {
      const l = rng.tirer(libres);
      d.fermes = [l.id];
      log(c, `Faille temporelle : ${l.nom} est inaccessible pendant cette manche.`, false);
    }
  } else if (tirage < 0.7) {
    const solIds = cartesDeLHypothese(d.solution);
    const pool = CARTES.filter((k) => !solIds.includes(k.id));
    const k = rng.tirer(pool);
    for (const p of d.joueurs) apprendreInnocente(p, k.id);
    log(c, `Un témoin des Archives affirme publiquement que ${k.nom} n’est pas impliqué(e).`, false);
  }
}

export function terminer(c: Ctx, gagnant: JoueurAR | null) {
  const { d } = c;
  const s = d.solution;
  const histoire = `${nomCarte(s.suspect)} a dérobé ${nomCarte(s.artefact)} à ${nomCarte(s.lieu)}. Mobile : ${nomCarte(s.mobile)}.`;
  d.phase = 'fin';
  d.refutation = null;
  d.vainqueur = gagnant
    ? { titre: `${gagnant.pseudo} a résolu l’affaire des Archives !`, vainqueurs: [gagnant.id], histoire }
    : { titre: 'Les Archives se referment : l’enquête est classée sans suite.', vainqueurs: [], histoire };
  log(c, `${d.vainqueur.titre} ${histoire}`);
}

function finTour(c: Ctx) {
  const { d } = c;
  if (d.joueurs.every((p) => p.elimine)) return terminer(c, null);
  for (let k = 1; k <= d.ordre.length; k++) {
    const idx = (d.actif + k) % d.ordre.length;
    if (idx === d.premier) {
      d.manche += 1;
      if (d.manche > d.toursMax) return terminer(c, null);
      evenementManche(c);
    }
    if (!joueur(d, d.ordre[idx])!.elimine) {
      d.actif = idx;
      return debutTour(c);
    }
  }
}

function arriver(c: Ctx, p: JoueurAR, noeudId: string) {
  const { d } = c;
  const n = NOEUD_PAR_ID[noeudId];
  if (p.noeud !== noeudId) log(c, `${p.pseudo} se rend à ${n.nom}.`);
  p.noeud = noeudId;
  if (n.type === 'secondaire') {
    temoignage(c, p, noeudId);
    d.etape = 'fin';
    return;
  }
  if (!p.lieuxVisites.includes(noeudId)) {
    p.lieuxVisites.push(noeudId);
    if (p.perso === 'archeologue' && p.lieuxVisites.length <= 3) genererIndice(c, p, 'Fouilles', 'artefact');
  }
  d.etape = 'hypothese';
}

/** Le PNJ du site est-il encore à consulter pour ce joueur ? */
export const pnjDisponible = (p: JoueurAR, noeudId: string) => { const pnj = pnjDe(noeudId); return !!pnj && !p.vusPNJ.includes(pnj.code); };

function temoignage(c: Ctx, p: JoueurAR, noeudId: string) {
  const pnj = pnjDe(noeudId);
  if (!pnj) return;
  if (p.vusPNJ.includes(pnj.code)) return info(c, p, pnj.nom, '« Je vous ai déjà tout dit. »');
  p.vusPNJ.push(pnj.code);
  log(c, `${p.pseudo} consulte ${pnj.nom}.`, false);
  const nb = p.perso === 'historienne' ? 2 : 1;
  for (let i = 0; i < nb; i++) {
    const cat = pnj.specialite && c.rng.suivant() < 0.65 ? pnj.specialite : undefined;
    genererIndice(c, p, pnj.nom, cat, p.perso === 'linguiste');
  }
}

// ------------------------------------------------------------------ Hypothèse et réfutation

function lancerHypothese(c: Ctx, p: JoueurAR) {
  const { d } = c;
  const h: Hypothese = {
    auteur: p.id, suspect: d.brouillon.suspect, artefact: d.brouillon.artefact, mobile: d.brouillon.mobile,
    lieu: p.noeud, refutePar: null, manche: d.manche,
  };
  d.hypotheses.push(h);
  d.hypCourante = h;
  d.brouillon = {};
  log(c, `${p.pseudo} : « Je pense que c’est ${nomCarte(h.suspect)}, avec ${nomCarte(h.artefact)}, à ${nomCarte(h.lieu)}. Mobile : ${nomCarte(h.mobile).toLowerCase()}. »`);

  const cartes = cartesDeLHypothese(h);
  const n = d.ordre.length;
  const debut = d.ordre.indexOf(p.id);
  for (let k = 1; k < n; k++) {
    const q = joueur(d, d.ordre[(debut + k) % n])!;
    const options = q.main.filter((id) => cartes.includes(id));
    if (!options.length) continue;
    h.refutePar = q.id;
    log(c, `${q.pseudo} est en mesure de réfuter.`, false);
    if (options.length === 1) montrer(c, q, options[0]);
    else {
      d.phase = 'refutation';
      d.refutation = { refuter: q.id, options };
    }
    return;
  }
  log(c, 'Personne ne peut réfuter cette hypothèse !');
  d.etape = 'fin';
}

function montrer(c: Ctx, q: JoueurAR, carteId: string) {
  const { d } = c;
  const h = d.hypCourante!;
  const auteur = joueur(d, h.auteur)!;
  auteur.montrees[carteId] = q.id;
  apprendreInnocente(auteur, carteId);
  info(c, auteur, 'Réfutation', `${q.pseudo} vous montre : ${nomCarte(carteId)}.`);
  if (auteur.perso === 'alchimiste') genererIndice(c, auteur, 'Distillation', CARTE_PAR_ID[carteId].cat);
  log(c, `${q.pseudo} réfute l’hypothèse en montrant une carte à ${auteur.pseudo}.`, false);
  d.phase = 'tour';
  d.refutation = null;
  d.etape = 'fin';
}

function accuser(c: Ctx, p: JoueurAR) {
  const { d } = c;
  const b = d.brouillon;
  const s = d.solution;
  const juste = b.suspect === s.suspect && b.artefact === s.artefact && b.lieu === s.lieu && b.mobile === s.mobile;
  log(c, `${p.pseudo} porte son accusation : ${nomCarte(b.suspect)}, ${nomCarte(b.artefact)}, ${nomCarte(b.lieu)}, ${nomCarte(b.mobile).toLowerCase()}.`);
  d.brouillon = {};
  if (juste) return terminer(c, p);
  p.elimine = true;
  log(c, `${p.pseudo} s’est trompé(e) et quitte l’enquête. Ses cartes serviront encore à réfuter.`);
  finTour(c);
}

// ------------------------------------------------------------------ Descripteurs (ce que le téléphone propose)

function optionsCartes(cat: Categorie) {
  return CARTES_PAR_CAT[cat].map((k) => ({ valeur: k.id, libelle: k.nom }));
}

export function destinations(d: EtatAR, p: JoueurAR) {
  const dist = distances(p.noeud, d.fermes);
  const pas = pasDe(d, p);
  return NOEUDS.filter((n) => (dist.get(n.id) ?? 99) <= pas)
    .map((n) => ({ n, dist: dist.get(n.id)! }))
    .sort((a, b) => a.dist - b.dist || a.n.nom.localeCompare(b.n.nom, 'fr'));
}

export function descripteursAR(d: EtatAR, j: JoueurAR): Descripteur[] {
  if (d.phase === 'fin') return [];
  if (d.phase === 'refutation') {
    if (d.refutation?.refuter !== j.id) return [];
    return [{
      id: 'montrer', type: 'choix', libelle: 'Plusieurs de tes cartes réfutent cette hypothèse : laquelle montres-tu en secret ?',
      options: d.refutation.options.map((id) => ({ valeur: id, libelle: nomCarte(id) })),
    }];
  }
  if (joueurActif(d).id !== j.id || j.elimine) return [];

  switch (d.etape) {
    case 'pouvoir':
      return [{
        id: 'pouvoir', type: 'choix', libelle: 'Veux-tu utiliser ton pouvoir ?',
        options: [{ valeur: 'non', libelle: 'Continuer sans pouvoir' }, { valeur: 'oui', libelle: PERSO_PAR_CODE[j.perso].actif ?? 'Utiliser mon pouvoir' }],
      }];
    case 'raccourci':
      return [{
        id: 'dest', type: 'choix', libelle: 'Où le raccourci temporel te mène-t-il ?',
        options: NOEUDS.filter((n) => n.id !== j.noeud && !d.fermes.includes(n.id)).map((n) => ({ valeur: n.id, libelle: `${n.nom} (${n.type === 'lieu' ? 'enquête' : 'témoin'})` })),
      }];
    case 'detection':
      return [{ id: 'categorie', type: 'choix', libelle: 'Quelle catégorie sonder ?', options: CATEGORIES.map((x) => ({ valeur: x.cat, libelle: x.titre })) }];
    case 'deplacement':
      return [{
        id: 'dest', type: 'choix', libelle: `Où vas-tu ? (jusqu’à ${pasDe(d, j)} pas)`,
        options: destinations(d, j).map(({ n, dist }) => ({
          valeur: n.id,
          libelle: `${dist === 0 ? 'Rester à ' : ''}${n.nom} · ${n.type === 'lieu' ? 'enquête' : j.vusPNJ.includes(n.pnj!) ? 'témoin déjà consulté' : 'témoin'}${dist ? ` · ${dist} pas` : ''}`,
        })),
      }];
    case 'hypothese':
      return [{
        id: 'hypothese', type: 'choix', libelle: `Tu es à ${nomNoeud(j.noeud)}. Une hypothèse ?`,
        options: [
          { valeur: 'oui', libelle: 'Formuler une hypothèse ici' },
          ...(pnjDisponible(j, j.noeud) ? [{ valeur: 'pnj', libelle: `Interroger ${pnjDe(j.noeud)!.nom} (à la place d’une hypothèse)` }] : []),
          { valeur: 'non', libelle: 'Poursuivre sans hypothèse' },
        ],
      }];
    case 'h_suspect': return [{ id: 'suspect', type: 'choix', libelle: 'Qui soupçonnes-tu ?', options: optionsCartes('suspect') }];
    case 'h_artefact': return [{ id: 'artefact', type: 'choix', libelle: 'Quel artefact a été dérobé ?', options: optionsCartes('artefact') }];
    case 'h_mobile': return [{ id: 'mobile', type: 'choix', libelle: 'Pour quel mobile ?', options: optionsCartes('mobile') }];
    case 'fin':
      return [{
        id: 'fin', type: 'choix', libelle: 'Que fais-tu pour finir ton tour ?',
        options: [
          { valeur: 'terminer', libelle: 'Terminer mon tour' },
          ...(j.perso === 'horloger' && !j.pouvoirUtilise ? [{ valeur: 'rejouer', libelle: 'Remontage : me déplacer à nouveau (1 fois)' }] : []),
          { valeur: 'accuser', libelle: 'Faire mon accusation finale (une seule chance)' },
        ],
      }];
    case 'a_suspect':
      return [{ id: 'a_suspect', type: 'choix', libelle: 'Accusation : qui est le coupable ?', options: [{ valeur: '__annuler', libelle: '← Finalement, non' }, ...optionsCartes('suspect')] }];
    case 'a_artefact': return [{ id: 'a_artefact', type: 'choix', libelle: 'Accusation : quel artefact ?', options: optionsCartes('artefact') }];
    case 'a_lieu': return [{ id: 'a_lieu', type: 'choix', libelle: 'Accusation : dans quel lieu ?', options: optionsCartes('lieu') }];
    case 'a_mobile': return [{ id: 'a_mobile', type: 'choix', libelle: 'Accusation : quel mobile ?', options: optionsCartes('mobile') }];
  }
}

export function attenteAR(d: EtatAR): Attente {
  if (d.phase === 'fin') return { attendus: [], dureeSecondes: null };
  if (d.phase === 'refutation') return { attendus: [d.refutation!.refuter], dureeSecondes: d.config.dureeReponseSecondes };
  return { attendus: [d.ordre[d.actif]], dureeSecondes: d.config.dureeTourSecondes };
}

export function validerAR(d: EtatAR, joueurId: JoueurId, a: ActionJoueur): Validation {
  const j = joueur(d, joueurId);
  if (!j) return { ok: false, raison: 'Joueur inconnu' };
  const desc = descripteursAR(d, j).find((x) => x.id === a.id);
  if (!desc) return { ok: false, raison: 'Action indisponible' };
  return validerValeur(desc, a.valeur);
}

// ------------------------------------------------------------------ Application des actions

export function appliquerAR(c: Ctx, p: JoueurAR, a: ActionJoueur) {
  const { d } = c;
  const v = a.valeur as string;

  if (d.phase === 'refutation') return montrer(c, p, v);

  switch (d.etape) {
    case 'pouvoir':
      if (v === 'oui') d.etape = p.perso === 'cartographe' ? 'raccourci' : 'detection';
      else d.etape = 'deplacement';
      return;
    case 'raccourci':
      p.pouvoirUtilise = true;
      log(c, `${p.pseudo} ouvre un raccourci temporel.`);
      return arriver(c, p, v);
    case 'detection':
      p.pouvoirUtilise = true;
      genererIndice(c, p, 'Détection d’anomalie', v as Categorie);
      d.etape = 'deplacement';
      return;
    case 'deplacement':
      return arriver(c, p, v);
    case 'hypothese':
      if (v === 'pnj') temoignage(c, p, p.noeud);
      d.etape = v === 'oui' ? 'h_suspect' : 'fin';
      return;
    case 'h_suspect': d.brouillon.suspect = v; d.etape = 'h_artefact'; return;
    case 'h_artefact': d.brouillon.artefact = v; d.etape = 'h_mobile'; return;
    case 'h_mobile': d.brouillon.mobile = v; return lancerHypothese(c, p);
    case 'fin':
      if (v === 'terminer') return finTour(c);
      if (v === 'rejouer') {
        p.pouvoirUtilise = true;
        log(c, `${p.pseudo} remonte le temps et repart en enquête.`);
        d.etape = 'deplacement';
        return;
      }
      d.brouillon = {};
      d.etape = 'a_suspect';
      return;
    case 'a_suspect':
      if (v === '__annuler') { d.etape = 'fin'; return; }
      d.brouillon.suspect = v; d.etape = 'a_artefact'; return;
    case 'a_artefact': d.brouillon.artefact = v; d.etape = 'a_lieu'; return;
    case 'a_lieu': d.brouillon.lieu = v; d.etape = 'a_mobile'; return;
    case 'a_mobile': d.brouillon.mobile = v; return accuser(c, p);
  }
}

/** Minuteur expiré : la réfutation choisit au hasard ; un tour inachevé est simplement terminé. */
export function avancerAR(c: Ctx) {
  const { d } = c;
  if (d.phase === 'fin') return;
  if (d.phase === 'refutation') {
    const r = d.refutation!;
    return montrer(c, joueur(d, r.refuter)!, c.rng.tirer(r.options));
  }
  const p = joueurActif(d);
  log(c, `${p.pseudo} a laissé filer le temps.`, false);
  d.brouillon = {};
  finTour(c);
}
