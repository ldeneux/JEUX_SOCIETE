/**
 * Catalogue des 28 rôles, côté code (le moteur est pur : pas d'accès base dans setup()).
 * Miroir de jeux.loupgarou_roles (migration 001) : si tu changes un poids ou un score ici,
 * mets la table à jour (ou génère le seed depuis ce fichier).
 */
export type Camp = 'village' | 'loups' | 'solo';
export type Palier = 'obligatoire' | 'courant' | 'rare' | 'chaos';

export interface RoleDef {
  code: string;
  nom: string;
  camp: Camp;
  famille: string;
  palier: Palier;
  presence?: number; // probabilité de base (rôles "quasi obligatoires")
  poids: number; // poids de tirage
  score: number; // budget d'équilibre : village +, loups/solos -
  minJoueurs: number;
  ordreNuit: number | null; // null = pas de réveil
  nuit1Only: boolean;
  tags: string[];
  incompatibles: string[];
}

const r = (
  code: string, nom: string, camp: Camp, famille: string, palier: Palier,
  poids: number, score: number, minJoueurs: number, ordreNuit: number | null, tags: string[],
  o: { presence?: number; nuit1Only?: boolean; incompatibles?: string[] } = {},
): RoleDef => ({
  code, nom, camp, famille, palier, poids, score, minJoueurs, ordreNuit, tags,
  presence: o.presence, nuit1Only: o.nuit1Only ?? false, incompatibles: o.incompatibles ?? [],
});

export const CATALOGUE: readonly RoleDef[] = [
  // Obligatoires
  r('villageois', 'Villageois', 'village', 'socle', 'obligatoire', 0, 1, 4, null, []),
  r('loup_garou', 'Loup-garou', 'loups', 'loup', 'obligatoire', 0, -6, 4, 100, ['loup']),
  // Village : information
  r('voyante', 'Voyante', 'village', 'information', 'courant', 30, 7, 6, 70, ['info'], { presence: 0.9 }),
  r('medium', 'Médium', 'village', 'information', 'rare', 10, 2, 8, 150, ['info', 'unique']),
  r('petite_fille', 'Petite Fille', 'village', 'information', 'courant', 20, 3, 7, 100, ['info', 'passif']),
  r('renard', 'Renard', 'village', 'information', 'rare', 12, 4, 8, 80, ['info', 'unique']),
  r('montreur_ours', 'Montreur d’ours', 'village', 'information', 'rare', 12, 3, 8, null, ['info', 'aube', 'voisins']),
  r('corbeau', 'Corbeau', 'village', 'information', 'rare', 12, 2, 8, 160, ['vote']),
  r('juge', 'Juge', 'village', 'information', 'rare', 10, 2, 9, null, ['vote', 'jour', 'unique'], { incompatibles: ['ange'] }),
  // Village : protection et résistance
  r('salvateur', 'Salvateur', 'village', 'protection', 'courant', 20, 4, 8, 60, ['protection']),
  r('ancien', 'Ancien', 'village', 'protection', 'courant', 20, 3, 7, null, ['passif']),
  r('idiot', 'Idiot du village', 'village', 'protection', 'courant', 20, 2, 7, null, ['vote', 'passif']),
  r('bouc_emissaire', 'Bouc émissaire', 'village', 'protection', 'courant', 20, 1, 7, null, ['vote', 'passif']),
  r('aubergiste', 'Aubergiste', 'village', 'protection', 'rare', 10, 3, 9, 50, ['protection', 'blocage']),
  r('servante', 'Servante dévouée', 'village', 'protection', 'rare', 10, 2, 9, null, ['mort', 'unique']),
  r('cupidon', 'Cupidon', 'village', 'protection', 'courant', 20, 2, 6, 20, ['amoureux'], { nuit1Only: true }),
  // Village : pouvoirs actifs
  r('sorciere', 'Sorcière', 'village', 'actif', 'courant', 25, 6, 6, 120, ['potion'], { presence: 0.65 }),
  r('chasseur', 'Chasseur', 'village', 'actif', 'courant', 20, 3, 6, null, ['mort']),
  r('comedien', 'Comédien', 'village', 'actif', 'rare', 8, 5, 9, 90, ['pouvoirs'], { incompatibles: ['voleur'] }),
  // Loups
  r('loup_blanc', 'Loup blanc', 'loups', 'loup', 'chaos', 6, -8, 8, 115, ['loup', 'solo', 'nuits_paires']),
  r('infect', 'Infect Père des Loups', 'loups', 'loup', 'rare', 8, -7, 8, 110, ['loup', 'infection', 'unique']),
  r('grand_mechant_loup', 'Grand Méchant Loup', 'loups', 'loup', 'rare', 8, -7, 8, 101, ['loup']),
  // Solos et neutres
  r('joueur_flute', 'Joueur de flûte', 'solo', 'solo', 'chaos', 6, -5, 9, 140, ['solo', 'enchante']),
  r('pyromane', 'Pyromane', 'solo', 'solo', 'chaos', 6, -5, 9, 130, ['solo', 'feu']),
  r('voleur', 'Voleur', 'village', 'solo', 'chaos', 6, 0, 6, 10, ['setup', 'roles_extra'], { nuit1Only: true, incompatibles: ['comedien'] }),
  r('enfant_sauvage', 'Enfant sauvage', 'village', 'solo', 'rare', 10, 1, 7, 30, ['modele'], { nuit1Only: true, incompatibles: ['chien_loup'] }),
  r('ange', 'Ange', 'solo', 'solo', 'chaos', 6, 0, 8, null, ['solo', 'vote', 'jour1'], { incompatibles: ['juge'] }),
  r('dracula', 'Dracula', 'solo', 'solo', 'chaos', 6, -5, 10, 125, ['solo', 'corrupteur', 'marque']),
  r('chien_loup', 'Chien-loup', 'village', 'solo', 'rare', 10, 0, 7, 40, ['choix_camp'], { nuit1Only: true, incompatibles: ['enfant_sauvage'] }),
];

const PAR_CODE = new Map(CATALOGUE.map((x) => [x.code, x]));

export function parCode(code: string): RoleDef {
  const def = PAR_CODE.get(code);
  if (!def) throw new Error(`Rôle inconnu : ${code}`);
  return def;
}

/** Loup-blanc, Infect, Grand Méchant Loup : ils remplacent un loup simple. */
export const estVarianteLoup = (d: RoleDef) => d.camp === 'loups' && d.code !== 'loup_garou';
