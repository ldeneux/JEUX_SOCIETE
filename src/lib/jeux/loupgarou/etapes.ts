/**
 * ÉTAPES DE NUIT : une étape = un réveil. Le déroulé (deroule.ts) ne connaît aucun rôle :
 * il parcourt les étapes triées par `ordre`. Ajouter un rôle actif = enregistrer une étape.
 *
 * Étape 1 (ce fichier)  : Cupidon, Salvateur, Voyante, Loups (+ chat), Sorcière.
 * Étape 2 (etapes-speciales.ts) : les autres rôles actifs, dont Dracula.
 */
import type { Descripteur } from '../contract';
import { parCode } from './roles';
import { victimesProjetees } from './attaques';
import { choisirJoueurs, info, joueur, vivants, type Ctx, type EtatLG, type JoueurLG } from './etat';

export interface Etape {
  code: string;
  nom: string; // narration : « <nom>, réveille-toi »
  ordre: number;
  nuit1?: boolean;
  nuitsPaires?: boolean;
  /** Rôles qui déclenchent cette étape (vivants ou non : un mort donne un réveil factice). */
  declencheurs: string[] | 'toujours';
  acteurs(d: EtatLG): JoueurLG[];
  /** Toutes les questions possibles ; celles déjà répondues sont filtrées par le déroulé. */
  prompts(d: EtatLG, j: JoueurLG): Descripteur[];
  /** Actions facultatives toujours disponibles pendant l'étape (chat des loups). */
  extras?(d: EtatLG, j: JoueurLG): Descripteur[];
  repondre?(c: Ctx, j: JoueurLG, id: string, valeur: unknown): void;
  terminer?(c: Ctx): void;
}

export const ETAPES: Record<string, Etape> = {};
export const enregistrer = (e: Etape) => void (ETAPES[e.code] = e);

export const promptsRestants = (d: EtatLG, j: JoueurLG, e: Etape): Descripteur[] =>
  e.prompts(d, j).filter((p) => !(p.id in (d.reponses[j.id] ?? {})));

/** Joueurs vivants ayant l'un de ces rôles et non hébergés par l'Aubergiste. */
export const acteursAvecRole = (d: EtatLG, ...roles: string[]) =>
  d.joueurs.filter((j) => j.vivant && roles.includes(j.role) && !j.statuts.includes('heberge'));

// ------------------------------------------------------------------ Pouvoirs à cible unique
// Partagés entre le rôle lui-même et le Comédien.

export interface Pouvoir {
  code: string;
  libelle: string;
  cibles(d: EtatLG, acteur: JoueurLG): JoueurLG[];
  appliquer(c: Ctx, acteur: JoueurLG, cible: JoueurLG): void;
}
export const POUVOIRS: Record<string, Pouvoir> = {};

POUVOIRS.voyante = {
  code: 'voyante',
  libelle: 'Qui veux-tu sonder ?',
  cibles: (d, a) => vivants(d).filter((j) => j.id !== a.id),
  appliquer(c, a, cible) {
    if (cible.statuts.includes('heberge')) info(c, a, 'Vision', `${cible.pseudo} est introuvable cette nuit.`);
    else {
      info(c, a, 'Vision', `${cible.pseudo} est ${parCode(cible.role).nom}.`);
      (a.secret.connus ??= {})[cible.id] = cible.role; // mémoire de la Voyante (sert aux IA)
    }
  },
};

POUVOIRS.salvateur = {
  code: 'salvateur',
  libelle: 'Qui protèges-tu cette nuit ?',
  cibles: (d, a) => vivants(d).filter((j) => j.id !== a.secret.dernierProtege),
  appliquer(c, a, cible) {
    c.d.nuitEnCours.protege = cible.id;
    a.secret.dernierProtege = cible.id;
    info(c, a, 'Protection', `Tu protèges ${cible.pseudo} cette nuit.`);
  },
};

export function etapeDePouvoir(p: Pouvoir, role: string, ordre: number, nom: string, extra: Partial<Etape> = {}): Etape {
  return {
    code: role,
    nom,
    ordre,
    declencheurs: [role],
    acteurs: (d) => acteursAvecRole(d, role),
    prompts: (d, j) => {
      const cibles = p.cibles(d, j);
      return cibles.length ? [choisirJoueurs('cible', p.libelle, cibles, 1, 1)] : [];
    },
    repondre(c, j, _id, v) {
      const cible = joueur(c.d, (v as string[])[0]);
      if (cible) p.appliquer(c, j, cible);
    },
    ...extra,
  };
}

// ------------------------------------------------------------------ Étape 1 : noyau

enregistrer({
  code: 'cupidon',
  nom: 'Cupidon',
  ordre: 20,
  nuit1: true,
  declencheurs: ['cupidon'],
  acteurs: (d) => acteursAvecRole(d, 'cupidon'),
  prompts: (d) => [choisirJoueurs('amoureux', 'Désigne les deux amoureux', vivants(d), 2, 2)],
  repondre(c, j, _id, v) {
    const [a, b] = (v as string[]).map((id) => joueur(c.d, id)!);
    for (const [x, y] of [[a, b], [b, a]] as const) {
      x.statuts.push('amoureux');
      x.secret.amoureuxDe = y.id;
      info(c, x, 'Amoureux', `Tu es lié à ${y.pseudo} : si l’un meurt, l’autre le suit.`);
    }
    info(c, j, 'Cupidon', `Tu as uni ${a.pseudo} et ${b.pseudo}.`);
  },
});

enregistrer(etapeDePouvoir(POUVOIRS.salvateur, 'salvateur', 60, 'Le Salvateur'));
enregistrer(etapeDePouvoir(POUVOIRS.voyante, 'voyante', 70, 'La Voyante'));

/** Les loups : vote de la victime, chat, fragments pour la Petite Fille. */
enregistrer({
  code: 'loups',
  nom: 'Les Loups-garous',
  ordre: 100,
  declencheurs: 'toujours',
  acteurs: (d) => d.joueurs.filter((j) => j.vivant && j.camp === 'loups' && !j.statuts.includes('heberge')),
  prompts(d) {
    const proies = vivants(d).filter((j) => j.camp !== 'loups');
    return proies.length ? [choisirJoueurs('cible', 'Quelle proie dévorer ?', proies, 1, 1)] : [];
  },
  extras: () => [{ id: 'message', type: 'texte', libelle: 'Message à la meute', maxLongueur: 80 }],
  repondre(c, j, id, v) {
    if (id === 'message') {
      const texte = String(v).trim();
      const masque = texte.replace(/\p{L}/gu, (ch) => (c.rng.suivant() < 0.55 ? '•' : ch));
      c.d.chatLoups.push({ de: j.pseudo, texte, masque });
      if (c.d.chatLoups.length > 30) c.d.chatLoups.shift();
      return;
    }
    c.d.nuitEnCours.votesLoups[j.id] = (v as string[])[0];
  },
  terminer(c) {
    const comptes: Record<string, number> = {};
    for (const [votant, cible] of Object.entries(c.d.nuitEnCours.votesLoups)) {
      if (joueur(c.d, votant)?.vivant && joueur(c.d, cible)?.vivant) comptes[cible] = (comptes[cible] ?? 0) + 1;
    }
    const max = Math.max(0, ...Object.values(comptes));
    if (max === 0) return;
    const ex = Object.keys(comptes).filter((k) => comptes[k] === max);
    const victime = ex.length === 1 ? ex[0] : c.rng.tirer(ex);
    c.d.nuitEnCours.victimeLoups = victime;
    for (const l of c.d.joueurs.filter((x) => x.vivant && x.camp === 'loups')) {
      info(c, l, 'Meute', `La proie désignée : ${joueur(c.d, victime)!.pseudo}.`);
    }
  },
});

/** Sorcière : voit les morts RÉELS (après protections), puis choisit vie / mort. */
enregistrer({
  code: 'sorciere',
  nom: 'La Sorcière',
  ordre: 120,
  declencheurs: ['sorciere'],
  acteurs: (d) => acteursAvecRole(d, 'sorciere'),
  prompts(d, j) {
    const p: Descripteur[] = [];
    const victimes = victimesProjetees(d, ['loups', 'gml', 'loup_blanc']).map((id) => joueur(d, id)!);
    if (!j.secret.vieUtilisee && victimes.length) {
      p.push(choisirJoueurs('vie', 'Potion de vie : sauver une victime ?', victimes, 0, 1));
    }
    if (!j.secret.mortUtilisee) {
      p.push(choisirJoueurs('mort', 'Potion de mort : empoisonner quelqu’un ?', vivants(d).filter((x) => x.id !== j.id), 0, 1));
    }
    return p;
  },
  repondre(c, j, id, v) {
    const cible = joueur(c.d, (v as string[])[0]);
    if (!cible) return;
    if (id === 'vie') {
      c.d.nuitEnCours.sorciereVie = cible.id;
      j.secret.vieUtilisee = true;
      info(c, j, 'Potion de vie', `Tu as sauvé ${cible.pseudo}.`);
    } else {
      c.d.nuitEnCours.sorciereMort = cible.id;
      j.secret.mortUtilisee = true;
      info(c, j, 'Potion de mort', `Tu as empoisonné ${cible.pseudo}.`);
    }
  },
});
