/**
 * DÉROULÉ : machine à états de Ravensburg (Loup-garou).
 * nuit (étapes) -> annonce -> [décisions] -> [élection] -> discussion -> vote -> annonce -> [décisions] -> nuit...
 * Fonctions mutantes sur un Ctx (l'état est cloné par index.ts avant chaque appel).
 */
import type { ActionJoueur, Attente, Descripteur, Validation } from '../contract';
import { parCode } from './roles';
import { collecterAttaques, issue } from './attaques';
import {
  annoncer, campEffectif, choisirJoueurs, info, joueur, prive, pub, victoire, vivants, voisins, votants,
  type Ctx, type Decision, type EtatLG, type JoueurLG,
} from './etat';
import { ETAPES, promptsRestants, type Etape } from './etapes';
import './etapes-speciales'; // étape 2 : rôles spéciaux

// ------------------------------------------------------------------ Nuit : ordre des réveils

export function construireOrdre(d: EtatLG): string[] {
  const roles = new Set<string>();
  for (const j of d.joueurs) { roles.add(j.roleInitial); roles.add(j.role); }
  if (d.nuit === 1) d.voleurExtras.forEach((r) => roles.add(r));
  return Object.values(ETAPES)
    .filter((e) => e.declencheurs === 'toujours' || e.declencheurs.some((r) => roles.has(r)))
    .filter((e) => (!e.nuit1 || d.nuit === 1) && (!e.nuitsPaires || d.nuit % 2 === 0))
    .sort((a, b) => a.ordre - b.ordre)
    .map((e) => e.code);
}

export const etapeCourante = (d: EtatLG): Etape | undefined =>
  d.phase === 'nuit' ? ETAPES[d.reveil.ordre[d.reveil.index]] : undefined;

export function nouvelleNuit(c: Ctx) {
  const d = c.d;
  d.nuit += 1;
  for (const j of d.joueurs) j.statuts = j.statuts.filter((s) => s !== 'heberge');
  d.nuitEnCours = { votesLoups: {} };
  d.chatLoups = [];
  d.annonces = [];
  d.votes = {};
  d.pretsVote = [];
  d.corbeauCible = null;
  d.reponses = {};
  d.dernierVote = null;
  d.reveil = { ordre: construireOrdre(d), index: 0 };
  d.phase = 'nuit';
  pub(c, 'nuit', { nuit: d.nuit });
}

// ------------------------------------------------------------------ Attente et descripteurs

export function attenteLG(d: EtatLG): Attente {
  const cfg = d.config;
  switch (d.phase) {
    case 'nuit': {
      const e = etapeCourante(d)!;
      const attendus = e.acteurs(d).filter((j) => promptsRestants(d, j, e).length > 0).map((j) => j.id);
      return { attendus, dureeSecondes: cfg.dureeActionNuitSecondes, delaiMinimumSecondes: cfg.leurreSecondes };
    }
    case 'annonce':
      return { attendus: [], dureeSecondes: null, delaiMinimumSecondes: cfg.annonceSecondes };
    case 'decision':
      return { attendus: [d.decisions[0].acteur], dureeSecondes: cfg.dureeDecisionSecondes };
    case 'election':
    case 'vote':
      return { attendus: votants(d).filter((id) => !(id in d.votes)), dureeSecondes: cfg.dureeVoteSecondes };
    case 'discussion':
      return {
        attendus: vivants(d).map((j) => j.id).filter((id) => !d.pretsVote.includes(id)),
        dureeSecondes: cfg.dureeDiscussionSecondes,
      };
    default:
      return { attendus: [], dureeSecondes: null };
  }
}

function descripteurDecision(d: EtatLG, dec: Decision): Descripteur {
  switch (dec.type) {
    case 'tir':
      return choisirJoueurs('tir', 'Tu es mort : emporte quelqu’un avec toi ?', vivants(d), 0, 1);
    case 'maire':
      return choisirJoueurs('maire', 'Désigne ton successeur comme maire', vivants(d), 1, 1);
    case 'servante':
      return {
        id: 'servante', type: 'choix', libelle: 'Prendre le rôle d’un mort ?',
        options: [{ valeur: 'non', libelle: 'Non, merci' }, ...dec.candidats.map((id) => ({ valeur: id, libelle: joueur(d, id)!.pseudo }))],
      };
    case 'depart':
      return {
        id: 'depart', type: 'choix', libelle: 'Égalité : qui est éliminé ?',
        options: dec.candidats.map((id) => ({ valeur: id, libelle: joueur(d, id)!.pseudo })),
      };
  }
}

/** Ce que le joueur peut faire MAINTENANT (source unique pour la vue et la validation). */
export function descripteursLG(d: EtatLG, j: JoueurLG): Descripteur[] {
  switch (d.phase) {
    case 'nuit': {
      const e = etapeCourante(d)!;
      if (!e.acteurs(d).some((x) => x.id === j.id)) return [];
      return [...promptsRestants(d, j, e).slice(0, 1), ...(e.extras?.(d, j) ?? [])];
    }
    case 'election':
      if (!votants(d).includes(j.id) || j.id in d.votes) return [];
      return [choisirJoueurs('vote', 'Qui veux-tu élire maire ?', vivants(d).filter((x) => x.id !== j.id), 0, 1)];
    case 'vote':
      if (!votants(d).includes(j.id) || j.id in d.votes) return [];
      return [choisirJoueurs('vote', 'Qui éliminer ?', vivants(d).filter((x) => x.id !== j.id), 0, 1)];
    case 'discussion': {
      if (!j.vivant) return [];
      const out: Descripteur[] = [];
      if (!d.pretsVote.includes(j.id)) out.push({ id: 'pret', type: 'confirmer', libelle: 'Je suis prêt à voter' });
      if (j.role === 'juge' && !j.secret.jugeUtilise && !d.secondVote) {
        out.push({ id: 'juge', type: 'confirmer', libelle: 'Exiger un second vote (une seule fois)' });
      }
      return out;
    }
    case 'decision':
      return d.decisions[0].acteur === j.id ? [descripteurDecision(d, d.decisions[0])] : [];
    default:
      return [];
  }
}

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

export function validerLG(d: EtatLG, joueurId: string, a: ActionJoueur): Validation {
  const j = joueur(d, joueurId);
  if (!j) return { ok: false, raison: 'Joueur inconnu' };
  const desc = descripteursLG(d, j).find((x) => x.id === a.id);
  if (!desc) return { ok: false, raison: 'Action indisponible' };
  return validerValeur(desc, a.valeur);
}

// ------------------------------------------------------------------ Application des actions

export function appliquerLG(c: Ctx, j: JoueurLG, a: ActionJoueur) {
  const d = c.d;
  switch (d.phase) {
    case 'nuit': {
      const e = etapeCourante(d)!;
      if (promptsRestants(d, j, e)[0]?.id === a.id) (d.reponses[j.id] ??= {})[a.id] = a.valeur;
      e.repondre?.(c, j, a.id, a.valeur);
      break;
    }
    case 'election':
    case 'vote':
      d.votes[j.id] = a.valeur as string[];
      break;
    case 'discussion':
      if (a.id === 'pret') d.pretsVote.push(j.id);
      else if (a.id === 'juge') {
        j.secret.jugeUtilise = true;
        d.secondVote = true;
        annoncer(c, 'Le Juge exige un second vote aujourd’hui.');
      }
      break;
    case 'decision':
      resoudreDecision(c, d.decisions[0], a.valeur);
      break;
  }
}

/** Fin de phase : minuteur expiré, ou tout le monde a agi. */
export function avancerLG(c: Ctx) {
  const d = c.d;
  switch (d.phase) {
    case 'nuit': {
      etapeCourante(d)!.terminer?.(c);
      d.reveil.index += 1;
      d.reponses = {};
      if (d.reveil.index >= d.reveil.ordre.length) resoudreNuit(c);
      break;
    }
    case 'annonce':
      apresMorts(c, d.suite);
      break;
    case 'decision':
      resoudreDecision(c, d.decisions[0], null);
      break;
    case 'election':
      resoudreElection(c);
      break;
    case 'discussion':
      d.phase = 'vote';
      d.votes = {};
      break;
    case 'vote':
      resoudreVote(c);
      break;
  }
}

// ------------------------------------------------------------------ Morts

export function tuer(c: Ctx, id: string, cause: string) {
  const d = c.d;
  const j = joueur(d, id);
  if (!j || !j.vivant) return;
  j.vivant = false;
  j.causeMort = cause;
  d.morts.push(id);
  if (d.config.reveleRoleDesMorts) j.roleRevele = true;
  annoncer(c, `${j.pseudo} est mort${j.roleRevele ? ` (${parCode(j.role).nom})` : ''}.`);
  pub(c, 'mort', { joueurId: id, role: j.roleRevele ? j.role : null }); // jamais la cause : elle trahirait les pouvoirs

  if (j.maire) {
    j.maire = false;
    if (vivants(d).length) d.decisions.push({ type: 'maire', acteur: id });
  }
  if (j.role === 'chasseur' && !j.secret.tireFait && vivants(d).length) d.decisions.push({ type: 'tir', acteur: id });

  const amour = j.statuts.includes('amoureux') ? joueur(d, j.secret.amoureuxDe) : undefined;
  if (amour?.vivant) tuer(c, amour.id, 'amour');

  for (const e of d.joueurs) {
    if (e.vivant && e.role === 'enfant_sauvage' && e.secret.modele === id) {
      e.role = 'loup_garou';
      e.camp = 'loups';
      info(c, e, 'Transformation', `Ton modèle est mort : tu deviens Loup-garou.`);
    }
  }
}

function terminer(c: Ctx, v: NonNullable<EtatLG['vainqueur']>) {
  c.d.vainqueur = v;
  c.d.phase = 'fin';
  pub(c, 'fin', { camp: v.camp, titre: v.titre });
}

/** Après des morts : victoire ? décisions en attente ? sinon on enchaîne. */
export function apresMorts(c: Ctx, suite: 'jour' | 'nuit') {
  const d = c.d;
  const v = victoire(d);
  if (v) return terminer(c, v);
  if (d.decisions.length === 0 && d.morts.length > 0) {
    const servante = d.joueurs.find((j) => j.vivant && j.role === 'servante');
    if (servante) d.decisions.push({ type: 'servante', acteur: servante.id, candidats: [...d.morts] });
    d.morts = [];
  }
  if (d.decisions.length > 0) {
    d.phase = 'decision';
    d.suite = suite;
    return;
  }
  lancer(c, suite);
}

function lancer(c: Ctx, suite: 'jour' | 'nuit') {
  const d = c.d;
  d.morts = [];
  if (suite === 'jour') {
    for (const j of vivants(d).filter((x) => x.role === 'montreur_ours')) {
      const grogne = voisins(d, j.id).some((n) => n.camp === 'loups');
      info(c, j, 'Montreur d’ours', grogne ? 'Grrr… un loup est tout près de toi.' : 'Silence : tes voisins sont sains.');
    }
    d.votes = {};
    d.pretsVote = [];
    d.phase = d.config.maire && d.nuit === 1 && !d.joueurs.some((j) => j.maire && j.vivant) ? 'election' : 'discussion';
    return;
  }
  if (d.secondVote) {
    d.secondVote = false;
    d.votes = {};
    d.phase = 'vote';
    return;
  }
  nouvelleNuit(c);
}

// ------------------------------------------------------------------ Décisions

export function resoudreDecision(c: Ctx, dec: Decision, valeur: unknown) {
  const d = c.d;
  d.decisions.shift();
  switch (dec.type) {
    case 'tir': {
      const tireur = joueur(d, dec.acteur)!;
      tireur.secret.tireFait = true;
      const cible = joueur(d, Array.isArray(valeur) ? valeur[0] : undefined);
      if (cible?.vivant) {
        annoncer(c, `${tireur.pseudo} tire une dernière balle sur ${cible.pseudo} !`);
        tuer(c, cible.id, 'chasseur');
      }
      break;
    }
    case 'maire': {
      const choisi = joueur(d, Array.isArray(valeur) ? valeur[0] : undefined);
      const nouveau = choisi?.vivant ? choisi : c.rng.tirer(vivants(d));
      nouveau.maire = true;
      annoncer(c, `${nouveau.pseudo} devient le nouveau maire.`);
      break;
    }
    case 'servante': {
      const s = joueur(d, dec.acteur)!;
      const x = typeof valeur === 'string' && valeur !== 'non' ? joueur(d, valeur) : undefined;
      if (x && s.vivant && s.role === 'servante' && dec.candidats.includes(x.id)) {
        // Le lien d'amoureux et les infos privées appartiennent à la PERSONNE ; le reste suit le rôle.
        const perso = (j: JoueurLG) => ({ infos: j.secret.infos ?? [], amoureuxDe: j.secret.amoureuxDe });
        const persoS = perso(s);
        const persoX = perso(x);
        s.role = x.role;
        s.camp = x.camp;
        s.secret = { ...x.secret, ...persoS };
        x.role = 'servante';
        x.camp = 'village';
        x.secret = persoX;
        x.roleRevele = true;
        annoncer(c, `${s.pseudo}, la Servante dévouée, prend la place de ${x.pseudo}.`);
        info(c, s, 'Servante', `Tu es désormais ${parCode(s.role).nom}.`);
      }
      break;
    }
    case 'depart':
      eliminerParVote(c, typeof valeur === 'string' ? valeur : c.rng.tirer(dec.candidats));
      break;
  }
  if (d.phase === 'decision' && d.decisions.length === 0) apresMorts(c, d.suite);
}

// ------------------------------------------------------------------ Matin : résolution de la nuit

export function resoudreNuit(c: Ctx) {
  const d = c.d;
  const n = d.nuitEnCours;
  d.annonces = [];
  d.morts = [];

  const aMourir = new Map<string, string>();
  for (const a of collecterAttaques(d)) {
    const r = issue(d, a);
    const cible = joueur(d, a.cible)!;
    if (r === 'ancien') {
      cible.secret.ancienUtilise = true;
      info(c, cible, 'Ancien', 'Les loups t’ont attaqué cette nuit, mais tu as survécu. Une seule fois.');
    } else if (r === 'infecte') {
      cible.camp = 'loups';
      cible.statuts = cible.statuts.filter((s) => s !== 'corrompu');
      cible.statuts.push('infecte');
      info(c, cible, 'Infecté', 'Les loups t’ont infecté : tu rejoins leur camp. Tu gardes ton pouvoir.');
    } else if (r === 'mort' && !aMourir.has(a.cible)) {
      aMourir.set(a.cible, a.source);
    }
  }
  if (n.feu) for (const j of d.joueurs) j.statuts = j.statuts.filter((s) => s !== 'asperge');

  const ordre = [...aMourir.keys()].sort((x, y) => joueur(d, x)!.place - joueur(d, y)!.place);
  for (const id of ordre) tuer(c, id, aMourir.get(id)!);
  if (ordre.length === 0) annoncer(c, 'Le village se réveille : personne n’est mort cette nuit.');

  d.corbeauCible = n.corbeau && joueur(d, n.corbeau)?.vivant ? n.corbeau : null;
  if (d.corbeauCible) annoncer(c, `Un corbeau a désigné ${joueur(d, d.corbeauCible)!.pseudo} : +2 votes contre lui aujourd’hui.`);

  d.phase = 'annonce';
  d.suite = 'jour';
}

// ------------------------------------------------------------------ Jour : élection et vote

function resoudreElection(c: Ctx) {
  const d = c.d;
  const poids: Record<string, number> = {};
  for (const [votant, ids] of Object.entries(d.votes)) {
    if (joueur(d, votant)?.vivant && ids[0] && joueur(d, ids[0])?.vivant) poids[ids[0]] = (poids[ids[0]] ?? 0) + 1;
  }
  const max = Math.max(0, ...Object.values(poids));
  const ex = max > 0 ? Object.keys(poids).filter((k) => poids[k] === max) : vivants(d).map((j) => j.id);
  const maire = joueur(d, c.rng.tirer(ex))!;
  maire.maire = true;
  annoncer(c, `${maire.pseudo} est élu maire de Ravensburg (voix double).`);
  d.votes = {};
  d.pretsVote = [];
  d.phase = 'discussion';
}

function eliminerParVote(c: Ctx, id: string) {
  const d = c.d;
  const j = joueur(d, id)!;
  if (j.role === 'idiot' && !j.statuts.includes('gracie')) {
    j.statuts.push('gracie', 'sans_vote');
    j.roleRevele = true;
    annoncer(c, `${j.pseudo} est l’Idiot du village : gracié, mais il perd son droit de vote.`);
  } else {
    annoncer(c, `Le village a désigné ${j.pseudo}.`);
    tuer(c, id, 'vote');
    if (j.role === 'ange' && d.nuit === 1) {
      return terminer(c, { camp: 'ange', titre: 'L’Ange a gagné : éliminé dès le premier vote', vainqueurs: [id] });
    }
  }
  d.phase = 'annonce';
  d.suite = 'nuit';
}

function resoudreVote(c: Ctx) {
  const d = c.d;
  const poids: Record<string, number> = {};
  const detail: { votant: string; cible: string }[] = [];
  for (const [votant, ids] of Object.entries(d.votes)) {
    const v = joueur(d, votant);
    const cible = joueur(d, ids[0]);
    if (!v?.vivant || !cible?.vivant) continue;
    poids[cible.id] = (poids[cible.id] ?? 0) + (v.maire ? 2 : 1);
    detail.push({ votant: v.pseudo, cible: cible.pseudo });
  }
  if (d.corbeauCible && joueur(d, d.corbeauCible)?.vivant) poids[d.corbeauCible] = (poids[d.corbeauCible] ?? 0) + 2;
  d.dernierVote = d.config.votePublic ? detail : null;
  d.annonces = [];

  const max = Math.max(0, ...Object.values(poids));
  if (max === 0) {
    annoncer(c, 'Personne n’a voté : personne n’est éliminé.');
    d.phase = 'annonce';
    d.suite = 'nuit';
    return;
  }
  const ex = Object.keys(poids).filter((k) => poids[k] === max);
  if (ex.length === 1) return eliminerParVote(c, ex[0]);

  const bouc = vivants(d).find((j) => j.role === 'bouc_emissaire');
  const maire = vivants(d).find((j) => j.maire);
  if (bouc) {
    annoncer(c, 'Égalité : le bouc émissaire paie pour tous.');
    return eliminerParVote(c, bouc.id);
  }
  if (maire) {
    annoncer(c, 'Égalité : le maire doit trancher.');
    d.decisions.push({ type: 'depart', acteur: maire.id, candidats: ex });
    d.phase = 'decision';
    d.suite = 'nuit';
    return;
  }
  eliminerParVote(c, c.rng.tirer(ex));
}

// (prive est ré-exporté pour les étapes spéciales)
export { prive, campEffectif };
