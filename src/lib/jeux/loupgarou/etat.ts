import type { Descripteur, Evenement, JoueurId, Rng } from '../contract';
import type { Camp } from './roles';
import type { Config } from './config';

export type Phase = 'nuit' | 'annonce' | 'decision' | 'election' | 'discussion' | 'vote' | 'fin';

export interface Info { libelle: string; valeur: string }

export interface JoueurLG {
  id: JoueurId;
  pseudo: string;
  place: number;
  roleInitial: string;
  role: string; // peut changer : Voleur, Servante...
  camp: Camp;
  vivant: boolean;
  maire: boolean;
  /** amoureux, infecte, enchante, asperge, heberge, gracie, sans_vote, corrompu */
  statuts: string[];
  /** Secrets du joueur : potions, dernier protégé, modèle, marques... Jamais envoyé tel quel. */
  secret: Record<string, any>;
  roleRevele: boolean;
  causeMort?: string;
}

export type Decision =
  | { type: 'tir'; acteur: JoueurId }
  | { type: 'maire'; acteur: JoueurId }
  | { type: 'servante'; acteur: JoueurId; candidats: JoueurId[] }
  | { type: 'depart'; acteur: JoueurId; candidats: JoueurId[] };

export interface NuitEnCours {
  votesLoups: Record<JoueurId, JoueurId>;
  victimeLoups?: JoueurId;
  victimeGML?: JoueurId;
  infecter?: boolean;
  protege?: JoueurId;
  heberge?: JoueurId;
  loupBlancCible?: JoueurId;
  sorciereVie?: JoueurId;
  sorciereMort?: JoueurId;
  corbeau?: JoueurId;
  feu?: boolean;
}

export interface Vainqueur { camp: string; titre: string; vainqueurs: JoueurId[] }
export interface MessageLoups { de: string; texte: string; masque: string }

export interface EtatLG {
  phase: Phase;
  nuit: number;
  joueurs: JoueurLG[];
  voleurExtras: string[];
  reveil: { ordre: string[]; index: number };
  reponses: Record<JoueurId, Record<string, unknown>>;
  nuitEnCours: NuitEnCours;
  decisions: Decision[];
  suite: 'jour' | 'nuit';
  morts: JoueurId[];
  annonces: string[];
  votes: Record<JoueurId, JoueurId[]>;
  pretsVote: JoueurId[];
  corbeauCible: JoueurId | null;
  secondVote: boolean;
  chatLoups: MessageLoups[];
  dernierVote: { votant: string; cible: string }[] | null;
  vainqueur: Vainqueur | null;
  mode: string;
  config: Config;
}

// ------------------------------------------------------------------ Helpers

export const joueur = (d: EtatLG, id: JoueurId | undefined | null): JoueurLG | undefined =>
  id ? d.joueurs.find((j) => j.id === id) : undefined;

export const vivants = (d: EtatLG) => d.joueurs.filter((j) => j.vivant);
export const votants = (d: EtatLG) => vivants(d).filter((j) => !j.statuts.includes('sans_vote')).map((j) => j.id);

/** Camp "réel" pour les conditions de victoire. */
export function campEffectif(j: JoueurLG): string {
  if (j.statuts.includes('corrompu') || j.role === 'dracula') return 'dracula';
  if (j.camp === 'loups') return 'loups';
  if (j.role === 'pyromane') return 'pyromane';
  if (j.role === 'joueur_flute') return 'flute';
  return 'village';
}

/** Voisins vivants les plus proches (gauche et droite) autour de la table. */
export function voisins(d: EtatLG, id: JoueurId): JoueurLG[] {
  const ring = [...d.joueurs].sort((a, b) => a.place - b.place);
  const i = ring.findIndex((j) => j.id === id);
  const n = ring.length;
  const res: JoueurLG[] = [];
  for (const dir of [-1, 1]) {
    for (let k = 1; k < n; k++) {
      const c = ring[(((i + dir * k) % n) + n) % n];
      if (c.vivant && c.id !== id) {
        if (!res.includes(c)) res.push(c);
        break;
      }
    }
  }
  return res;
}

export function choisirJoueurs(id: string, libelle: string, cands: readonly JoueurLG[], min: number, max: number): Descripteur {
  return { id, type: 'joueurs', libelle, candidats: cands.map((c) => c.id), min, max };
}

// ------------------------------------------------------------------ Contexte d'exécution

export interface Ctx { d: EtatLG; ev: Evenement[]; rng: Rng }

export const pub = (c: Ctx, type: string, donnees: Record<string, unknown> = {}) =>
  c.ev.push({ type, visibilite: { type: 'public' }, donnees });

export const prive = (c: Ctx, ids: JoueurId[], type: string, donnees: Record<string, unknown> = {}) =>
  c.ev.push({ type, visibilite: { type: 'prive', joueurs: ids }, donnees });

export function annoncer(c: Ctx, texte: string) {
  c.d.annonces.push(texte);
  pub(c, 'annonce', { texte });
}

/** Information privée ajoutée à l'écran d'un joueur (résultat de vision, infection...). */
export function info(c: Ctx, j: JoueurLG, libelle: string, valeur: string) {
  const l: Info[] = (j.secret.infos ??= []);
  l.push({ libelle, valeur });
  if (l.length > 15) l.splice(0, l.length - 15);
  prive(c, [j.id], 'info', { libelle, valeur });
}

// ------------------------------------------------------------------ Victoire

export function victoire(d: EtatLG): Vainqueur | null {
  const A = vivants(d);
  const deCamp = (camp: string) => d.joueurs.filter((j) => campEffectif(j) === camp).map((j) => j.id);

  if (A.length === 0) return { camp: 'nul', titre: 'Match nul : plus personne en vie', vainqueurs: [] };

  // Amoureux de camps différents, derniers survivants
  if (A.length === 2 && A.every((j) => j.statuts.includes('amoureux')) && campEffectif(A[0]) !== campEffectif(A[1])) {
    return { camp: 'amoureux', titre: 'Les amoureux ont triomphé de tout', vainqueurs: A.map((j) => j.id) };
  }

  // Joueur de flûte : tous les autres vivants sont enchantés
  const flute = A.find((j) => j.role === 'joueur_flute');
  if (flute && A.every((j) => j === flute || j.statuts.includes('enchante'))) {
    return { camp: 'flute', titre: 'Le Joueur de flûte a enchanté tout le village', vainqueurs: [flute.id] };
  }

  // Dracula : influence majoritaire, ou dernier pouvoir occulte
  const dracula = A.find((j) => j.role === 'dracula');
  if (dracula) {
    const sien = A.filter((j) => campEffectif(j) === 'dracula');
    const serviteurs = sien.length - 1;
    const occultes = A.filter((j) => ['loups', 'pyromane', 'flute'].includes(campEffectif(j)));
    const influence = serviteurs >= 2 && sien.length >= Math.ceil(A.length / 2);
    const dernier = d.config.draculaDernierPouvoir && occultes.length === 0;
    if (influence || dernier) {
      return {
        camp: 'dracula',
        titre: influence
          ? 'Dracula étend son ombre sur Ravensburg'
          : 'Dracula est le dernier pouvoir occulte de Ravensburg',
        vainqueurs: deCamp('dracula'),
      };
    }
  }

  const camps = new Set(A.map(campEffectif));
  if (camps.size === 1) {
    const camp = [...camps][0];
    if (camp === 'village') return { camp, titre: 'Le village a gagné', vainqueurs: deCamp('village') };
    if (camp === 'loups') {
      const blanc = A.find((j) => j.role === 'loup_blanc');
      if (!blanc) return { camp, titre: 'Les loups-garous ont gagné', vainqueurs: deCamp('loups') };
      if (A.length === 1) return { camp: 'loup_blanc', titre: 'Le Loup blanc règne seul', vainqueurs: [blanc.id] };
    }
    if (camp === 'pyromane') return { camp, titre: 'Le Pyromane a tout embrasé', vainqueurs: deCamp('pyromane') };
    if (camp === 'dracula') return { camp, titre: 'Dracula étend son ombre sur Ravensburg', vainqueurs: deCamp('dracula') };
  }
  return null;
}
