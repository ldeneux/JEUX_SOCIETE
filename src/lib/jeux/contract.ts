/**
 * CONTRAT D'UN MODULE DE JEU
 * --------------------------
 * Règles absolues pour tout module (loupgarou, manoir, ...) :
 *  1. Fonctions PURES : pas d'I/O, pas de Date.now(), pas de Math.random() (utiliser `rng`).
 *  2. `Etat` est sérialisable en JSON et contient TOUS les secrets. Il ne quitte jamais le serveur.
 *  3. Seules `vueConsole` et `vueJoueur` produisent ce qui sort du serveur.
 *     `vueJoueur(etat, A)` ne doit jamais contenir un secret que A n'a pas le droit de connaître.
 *  4. Les téléphones n'envoient que des `ActionJoueur`, jamais d'état.
 */
import type { ZodType } from 'zod';

export type JoueurId = string;

export interface Joueur {
  id: JoueurId;
  pseudo: string;
  place: number; // position autour de la table (voisins)
  /** Joueur piloté par le serveur (IA). */
  ia?: boolean;
}

// ---------------------------------------------------------------- Manifeste

export interface ModeDef {
  code: string;
  nom: string;
  description: string;
}

export type OptionDef =
  | { code: string; type: 'booleen'; libelle: string; defaut: boolean }
  | { code: string; type: 'nombre'; libelle: string; defaut: number; min: number; max: number }
  | { code: string; type: 'choix'; libelle: string; defaut: string; choix: { valeur: string; libelle: string }[] };

export interface Manifeste {
  code: string; // 'loupgarou' : identique à jeux.plateforme_catalogue.code et au préfixe des tables
  nom: string;
  description: string;
  visuel: string;
  joueurs: { min: number; max: number };
  dureeMinutes: number;
  modes: ModeDef[];
  options: OptionDef[]; // la console génère l'écran d'options à partir de cette liste
}

// ---------------------------------------------------------------- Aléatoire déterministe

export interface Rng {
  suivant(): number; // [0, 1[
  entier(max: number): number; // [0, max[
  tirer<T>(liste: readonly T[]): T;
  melanger<T>(liste: readonly T[]): T[];
}

/** mulberry32 amorcé par une chaîne : mêmes entrées => mêmes tirages (tests, replays). */
export function creerRng(graine: string): Rng {
  let h = 1779033703 ^ graine.length;
  for (let i = 0; i < graine.length; i++) {
    h = Math.imul(h ^ graine.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const suivant = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entier = (max: number) => Math.floor(suivant() * max);
  return {
    suivant,
    entier,
    tirer: (l) => l[entier(l.length)],
    melanger: (l) => {
      const r = [...l];
      for (let i = r.length - 1; i > 0; i--) {
        const j = entier(i + 1);
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    },
  };
}

// ---------------------------------------------------------------- Événements

export type Visibilite = { type: 'public' } | { type: 'prive'; joueurs: JoueurId[] };

export interface Evenement {
  type: string; // 'mort', 'amoureux_designes', 'vote_resultat'...
  visibilite: Visibilite;
  donnees: Record<string, unknown>;
}

export interface Transition<Etat> {
  etat: Etat;
  evenements: Evenement[];
}

// ---------------------------------------------------------------- Interactions téléphone

/** Ce que le téléphone envoie : l'id du descripteur proposé + la valeur choisie. */
export interface ActionJoueur {
  id: string;
  valeur: unknown;
}

/**
 * Ce que le serveur propose : le téléphone est un afficheur générique de descripteurs,
 * donc un nouveau jeu n'impose aucun nouveau composant mobile pour les cas courants.
 */
export type Descripteur =
  | { id: string; type: 'joueurs'; libelle: string; candidats: JoueurId[]; min: number; max: number }
  | { id: string; type: 'choix'; libelle: string; options: { valeur: string; libelle: string }[] }
  | { id: string; type: 'confirmer'; libelle: string; secondaire?: string }
  | { id: string; type: 'texte'; libelle: string; maxLongueur: number };

export type Validation = { ok: true } | { ok: false; raison: string };

// ---------------------------------------------------------------- Vues (seule sortie du serveur)

export interface VueJoueur {
  ecran: string; // clé d'écran du front du jeu : 'dors', 'role', 'action', 'mort', 'fin'
  titre: string;
  message?: string;
  carte?: { code: string; nom: string }; // sa carte secrète
  secrets: { libelle: string; valeur: string }[]; // infos privées déjà acquises
  actions: Descripteur[]; // vide = rien à faire
}

export interface VueConsole {
  ecran: string;
  titre: string;
  narration?: string; // texte lu par la narration vocale
  joueurs: { id: JoueurId; pseudo: string; place: number; vivant: boolean; badges: string[] }[];
  donnees: Record<string, unknown>; // public uniquement
}

// ---------------------------------------------------------------- Attente et résultat

export interface Attente {
  /** Joueurs dont on attend encore une action. Vide = la phase peut se résoudre. */
  attendus: JoueurId[];
  /** Temps laissé pour agir ; null = pas de limite. À expiration, le moteur appelle `avancer`. */
  dureeSecondes: number | null;
  /**
   * Durée minimale de la phase même si personne n'est attendu (rôle mort ou absent).
   * Indispensable : sinon la rapidité de la nuit trahit les rôles en jeu.
   */
  delaiMinimumSecondes?: number;
}

export interface Resultat {
  vainqueurs: JoueurId[];
  titre: string; // 'Les loups ont gagné'
  resume: string;
  stats: Record<string, unknown>;
}

// ---------------------------------------------------------------- Le contrat

export interface SetupCtx<Config> {
  joueurs: Joueur[];
  mode: string;
  config: Config;
  rng: Rng;
}

export interface JeuModule<Etat = unknown, Config = unknown> {
  manifeste: Manifeste;

  /** Valide et complète les options saisies sur la console (valeurs par défaut incluses). */
  configSchema: ZodType<Config>;

  /** Génère l'état initial (composition des rôles, distribution des cartes...). */
  setup(ctx: SetupCtx<Config>): Transition<Etat>;

  /** Qui doit agir maintenant, et combien de temps. */
  attente(etat: Etat): Attente;

  /** L'action est-elle légale à cet instant pour ce joueur ? Aucune mutation. */
  valider(etat: Etat, joueurId: JoueurId, action: ActionJoueur): Validation;

  /** Applique une action déjà validée. Peut résoudre la phase si tout le monde a agi. */
  appliquer(etat: Etat, joueurId: JoueurId, action: ActionJoueur, rng: Rng): Transition<Etat>;

  /** Passe à la phase suivante : minuteur expiré ou phase sans attente. Résout les conflits. */
  avancer(etat: Etat, rng: Rng): Transition<Etat>;

  vueConsole(etat: Etat): VueConsole;
  vueJoueur(etat: Etat, joueurId: JoueurId): VueJoueur;

  /** Non nul = partie terminée. */
  resultat(etat: Etat): Resultat | null;

  /**
   * Facultatif : joue pour un joueur IA. Ne doit utiliser que ce que ce joueur a le droit de savoir.
   * Retourne une action légale, ou null s'il n'y a rien à faire.
   */
  ia?(etat: Etat, joueurId: JoueurId, rng: Rng): ActionJoueur | null;
}
