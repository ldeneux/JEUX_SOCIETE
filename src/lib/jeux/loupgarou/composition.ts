/**
 * GÉNÉRATEUR DE COMPOSITION
 * -------------------------
 * Fonction pure : mêmes entrées (dont la graine du rng) => même composition.
 *
 * Garanties (testées dans composition.test.ts) :
 *  - exactement `nbJoueurs` rôles, au moins 1 Villageois et 1 Loup-garou simple ;
 *  - jamais deux fois le même rôle (hors Villageois et Loup-garou) ;
 *  - respect de min_joueurs, des incompatibilités, des plafonds chaos/solo par mode ;
 *  - dès 8 joueurs, au moins 1 rôle d'information ou de protection (si le mode en autorise) ;
 *  - les variantes de loup (Infect, Grand Méchant Loup, Loup blanc) REMPLACENT un loup simple.
 */
import type { Rng } from '../contract';
import { CATALOGUE, estVarianteLoup, type Palier, type RoleDef } from './roles';

export interface EntreeComposition {
  nbJoueurs: number;
  mode: string; // classique | equilibre | nouveautes | chaos | personnalise
  rng: Rng;
  imposes?: string[]; // mode personnalise : rôles cochés par l'hôte
  catalogue?: readonly RoleDef[];
  /** Parties écoulées depuis la dernière apparition de chaque rôle (loupgarou_fraicheur). */
  fraicheur?: Record<string, number>;
}

export interface Composition {
  roles: string[]; // longueur === nbJoueurs
  extras: string[]; // 2 cartes de plus si le Voleur est en jeu, sinon []
  score: number; // budget d'équilibre (0 = parfaitement équilibré sur le papier)
  avertissements: string[]; // surtout pour le mode personnalisé
}

// ------------------------------------------------------------------ Paramètres

export const nombreDeLoups = (n: number) => Math.max(1, Math.ceil(n / 4));

/** Nombre de compléments (variantes de loup incluses) selon la taille de la table. */
export function plageComplements(n: number): [number, number] {
  if (n <= 8) return [3, 4];
  if (n <= 12) return [5, 7];
  if (n <= 18) return [8, 11];
  return [11, 14];
}

interface Profil {
  paliers: Palier[];
  multPalier: Record<Palier, number>;
  chaosMax: number; // nb max de rôles du palier chaos
  soloMax: number; // nb max de rôles de camp solo
  variantesMax: number; // nb max de variantes de loup (plafonné à nbLoups - 1)
  fraicheur: number; // 0 = ignorée ; sinon force de l'effet "nouveautés"
  tolerance: number; // écart de score accepté ; Infinity = pas d'équilibrage
  presence: boolean; // applique les probabilités de présence (Voyante, Sorcière)
  bonusComplements: number;
}

const UN: Record<Palier, number> = { obligatoire: 1, courant: 1, rare: 1, chaos: 1 };

function profil(mode: string, n: number): Profil {
  const petit = n < 10;
  switch (mode) {
    case 'classique':
      return { paliers: ['courant'], multPalier: UN, chaosMax: 0, soloMax: 0, variantesMax: 0,
        fraicheur: 0, tolerance: 6, presence: true, bonusComplements: 0 };
    case 'equilibre':
      return { paliers: ['courant', 'rare', 'chaos'], multPalier: UN, chaosMax: petit ? 1 : 2,
        soloMax: petit ? 1 : 2, variantesMax: 2, fraicheur: 0.15, tolerance: 5, presence: true, bonusComplements: 0 };
    case 'nouveautes':
      return { paliers: ['courant', 'rare', 'chaos'], multPalier: { ...UN, rare: 1.5, chaos: 1.5 },
        chaosMax: petit ? 1 : 2, soloMax: petit ? 1 : 2, variantesMax: 2, fraicheur: 0.5, tolerance: 7,
        presence: true, bonusComplements: 0 };
    case 'chaos':
      return { paliers: ['courant', 'rare', 'chaos'], multPalier: { ...UN, rare: 1.5, chaos: 4 },
        chaosMax: 4, soloMax: 4, variantesMax: 3, fraicheur: 0.15, tolerance: Infinity, presence: false, bonusComplements: 2 };
    default:
      throw new Error(`Mode inconnu : ${mode}`);
  }
}

/** Associations "à surveiller" : pas interdites, mais rendues moins probables. */
const PENALITES: [string, string, number][] = [
  ['cupidon', 'pyromane', 0.4],
  ['cupidon', 'joueur_flute', 0.4],
  ['cupidon', 'loup_blanc', 0.5],
  ['ancien', 'infect', 0.6],
];

function penalite(a: string, b: string): number {
  const p = PENALITES.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return p ? p[2] : 1;
}

const NB_ESSAIS = 40;

// ------------------------------------------------------------------ Utilitaires

export function scoreRoles(codes: readonly string[], cat: readonly RoleDef[] = CATALOGUE): number {
  const m = new Map(cat.map((r) => [r.code, r.score]));
  return codes.reduce((s, c) => s + (m.get(c) ?? 0), 0);
}

function tirerPondere<T>(items: readonly T[], poids: (t: T) => number, rng: Rng): T {
  const ws = items.map(poids);
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return rng.tirer(items);
  let x = rng.suivant() * total;
  for (let i = 0; i < items.length; i++) {
    x -= ws[i];
    if (x < 0) return items[i];
  }
  return items[items.length - 1];
}

const incompatible = (a: RoleDef, b: RoleDef) => a.incompatibles.includes(b.code) || b.incompatibles.includes(a.code);

/** Loups simples + variantes + autres rôles, complétés par des Villageois jusqu'à n. */
function assembler(choisis: readonly RoleDef[], n: number, nbLoups: number): string[] {
  const variantes = choisis.filter(estVarianteLoup);
  const autres = choisis.filter((r) => !estVarianteLoup(r));
  const roles = [
    ...Array.from({ length: nbLoups - variantes.length }, () => 'loup_garou'),
    ...variantes.map((r) => r.code),
    ...autres.map((r) => r.code),
  ];
  while (roles.length < n) roles.push('villageois');
  return roles;
}

/** Les 2 cartes du Voleur : Villageois, Loup-garou ou rôles de village courants/rares. */
function tirerExtras(cat: readonly RoleDef[], choisis: readonly string[], n: number, rng: Rng): string[] {
  const deja = new Set(choisis);
  const defsChoisis = cat.filter((r) => deja.has(r.code));
  const pool = cat.filter(
    (r) =>
      r.camp === 'village' && (r.palier === 'courant' || r.palier === 'rare') &&
      !deja.has(r.code) && r.minJoueurs <= n && !defsChoisis.some((c) => incompatible(c, r)),
  );
  const extras: string[] = [];
  for (let i = 0; i < 2; i++) {
    const candidats: { code: string; poids: number }[] = [
      { code: 'villageois', poids: 4 },
      { code: 'loup_garou', poids: 1 },
      ...pool.filter((r) => !extras.includes(r.code)).map((r) => ({ code: r.code, poids: r.poids })),
    ];
    extras.push(tirerPondere(candidats, (c) => c.poids, rng).code);
  }
  return extras;
}

// ------------------------------------------------------------------ Modes générés

function tenter(e: Required<Pick<EntreeComposition, 'nbJoueurs' | 'rng'>> & {
  cat: readonly RoleDef[]; p: Profil; nbLoups: number; fraicheur: Record<string, number>;
}): Composition {
  const { nbJoueurs: n, rng, cat, p, nbLoups, fraicheur } = e;
  const [cmin, cmax] = plageComplements(n);
  const cible = cmin + rng.entier(cmax - cmin + 1) + p.bonusComplements;

  const maxVariantes = Math.min(p.variantesMax, nbLoups - 1);
  const maxNonLoups = n - nbLoups - 1; // au moins 1 Villageois
  const choisis: RoleDef[] = [];
  let chaos = 0, solos = 0, variantes = 0, nonLoups = 0;

  const peutAjouter = (r: RoleDef): boolean => {
    if (r.palier === 'obligatoire' || !p.paliers.includes(r.palier)) return false;
    if (r.minJoueurs > n || choisis.some((c) => c.code === r.code || incompatible(c, r))) return false;
    if (variantes + nonLoups >= cible) return false;
    if (r.palier === 'chaos' && chaos >= p.chaosMax) return false;
    if (r.camp === 'solo' && solos >= p.soloMax) return false;
    return estVarianteLoup(r) ? variantes < maxVariantes : nonLoups < maxNonLoups;
  };
  const ajouter = (r: RoleDef) => {
    choisis.push(r);
    if (r.palier === 'chaos') chaos++;
    if (r.camp === 'solo') solos++;
    if (estVarianteLoup(r)) variantes++; else nonLoups++;
  };

  // A. Rôles "quasi obligatoires" (Voyante ~90 %, Sorcière ~65 %)
  if (p.presence) {
    for (const r of cat) {
      if (r.presence !== undefined && peutAjouter(r) && rng.suivant() < r.presence) ajouter(r);
    }
  }

  // B. Garde-fou : dès 8 joueurs, au moins un rôle d'information ou de protection
  const estSoutien = (r: RoleDef) => r.tags.includes('info') || r.tags.includes('protection');
  if (n >= 8 && !choisis.some(estSoutien)) {
    const c = cat.filter((r) => estSoutien(r) && peutAjouter(r));
    if (c.length) ajouter(tirerPondere(c, (r) => r.poids, rng));
  }

  // C. Tirage pondéré du reste
  const poidsDe = (r: RoleDef): number => {
    let w = r.poids * p.multPalier[r.palier];
    if (p.fraicheur > 0) w *= 1 + Math.min(fraicheur[r.code] ?? 5, 10) * p.fraicheur;
    for (const c of choisis) w *= penalite(c.code, r.code);
    if (Number.isFinite(p.tolerance)) {
      const projete = scoreRoles(assembler([...choisis, r], n, nbLoups), cat);
      w /= 1 + Math.abs(projete) / p.tolerance;
    }
    return w;
  };
  for (;;) {
    const candidats = cat.filter(peutAjouter);
    if (!candidats.length) break;
    ajouter(tirerPondere(candidats, poidsDe, rng));
  }

  const roles = assembler(choisis, n, nbLoups);
  const extras = roles.includes('voleur') ? tirerExtras(cat, roles, n, rng) : [];
  return { roles, extras, score: scoreRoles(roles, cat), avertissements: [] };
}

// ------------------------------------------------------------------ Mode personnalisé

function composerPersonnalise(n: number, imposes: string[], cat: readonly RoleDef[], rng: Rng): Composition {
  const avert: string[] = [];
  const connus = new Map(cat.map((r) => [r.code, r]));

  let liste = imposes.filter((c) => {
    if (connus.has(c)) return true;
    avert.push(`Rôle inconnu ignoré : ${c}`);
    return false;
  });
  if (liste.length > n) {
    // On retire d'abord des Villageois, puis les derniers rôles cochés.
    while (liste.length > n && liste.includes('villageois')) liste.splice(liste.lastIndexOf('villageois'), 1);
    if (liste.length > n) {
      avert.push(`${liste.length - n} rôle(s) retiré(s) : plus de rôles que de joueurs`);
      liste = liste.slice(0, n);
    }
  }
  if (!liste.some((c) => connus.get(c)!.camp === 'loups')) {
    avert.push('Aucun loup : un Loup-garou a été ajouté');
    if (liste.length < n) liste.push('loup_garou');
    else liste[liste.length - 1] = 'loup_garou';
  }
  while (liste.length < n) liste.push('villageois');

  const defs = liste.map((c) => connus.get(c)!);
  const vus = new Set<string>();
  for (const d of defs) {
    if (d.minJoueurs > n) avert.push(`${d.nom} est conçu pour ${d.minJoueurs} joueurs ou plus`);
    if (d.code !== 'villageois' && d.code !== 'loup_garou') {
      if (vus.has(d.code)) avert.push(`${d.nom} apparaît plusieurs fois`);
      vus.add(d.code);
    }
  }
  for (let i = 0; i < defs.length; i++)
    for (let j = i + 1; j < defs.length; j++)
      if (incompatible(defs[i], defs[j])) avert.push(`${defs[i].nom} et ${defs[j].nom} sont incompatibles`);

  const loups = defs.filter((d) => d.camp === 'loups').length;
  if (loups * 2 > n) avert.push('Les loups sont trop nombreux pour cette table');
  const score = scoreRoles(liste, cat);
  if (Math.abs(score) > 10) avert.push(`Composition déséquilibrée (${score > 0 ? 'favorable au village' : 'favorable aux loups'})`);

  const extras = liste.includes('voleur') ? tirerExtras(cat, liste, n, rng) : [];
  return { roles: liste, extras, score, avertissements: avert };
}

// ------------------------------------------------------------------ Point d'entrée

export function composerRoles(e: EntreeComposition): Composition {
  const cat = e.catalogue ?? CATALOGUE;
  const n = e.nbJoueurs;
  if (n < 4) throw new Error('Il faut au moins 4 joueurs');
  if (e.mode === 'personnalise') return composerPersonnalise(n, e.imposes ?? [], cat, e.rng);

  const p = profil(e.mode, n);
  const nbLoups = nombreDeLoups(n);
  let meilleur: Composition | null = null;

  for (let i = 0; i < NB_ESSAIS; i++) {
    const c = tenter({ nbJoueurs: n, rng: e.rng, cat, p, nbLoups, fraicheur: e.fraicheur ?? {} });
    if (Math.abs(c.score) <= p.tolerance) return c;
    if (!meilleur || Math.abs(c.score) < Math.abs(meilleur.score)) meilleur = c;
  }
  return meilleur!;
}
