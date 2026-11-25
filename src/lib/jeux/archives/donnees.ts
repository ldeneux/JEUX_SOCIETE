/**
 * DONNÉES DE « CLUEDO : LES ARCHIVES DU TEMPS » : cartes d'enquête, personnages, PNJ et plateau.
 * Le plateau est la carte du monde : les coordonnées sont en % de l'image 1672×941 (public/archives/fond.webp).
 */
export type Categorie = 'suspect' | 'artefact' | 'lieu' | 'mobile';

export interface Carte { id: string; nom: string; cat: Categorie }

export const CATEGORIES: { cat: Categorie; titre: string; article: string }[] = [
  { cat: 'suspect', titre: 'Suspects', article: 'le suspect' },
  { cat: 'artefact', titre: 'Artefacts', article: 'l’artefact' },
  { cat: 'lieu', titre: 'Lieux', article: 'le lieu' },
  { cat: 'mobile', titre: 'Mobiles', article: 'le mobile' },
];

// ---------------------------------------------------------------- Personnages (= suspects)

export interface Perso { code: string; nom: string; pouvoir: string; resume: string; actif?: string }

export const PERSOS: Perso[] = [
  { code: 'archeologue', nom: 'L’Archéologue', pouvoir: 'Fouilles', resume: 'À sa première visite de chacun des 3 premiers lieux, elle découvre un artefact innocenté.' },
  { code: 'historienne', nom: 'L’Historienne', pouvoir: 'Érudition', resume: 'Chaque témoignage de PNJ lui livre 2 indices au lieu d’un.' },
  { code: 'explorateur', nom: 'L’Explorateur', pouvoir: 'Grandes enjambées', resume: 'Se déplace de 4 pas au lieu de 3.' },
  { code: 'cartographe', nom: 'Le Cartographe', pouvoir: 'Raccourci temporel', resume: 'Une fois par partie, se rend instantanément sur n’importe quel site.', actif: 'Raccourci temporel (1 fois)' },
  { code: 'conservateur', nom: 'Le Conservateur', pouvoir: 'Inventaire', resume: 'Commence l’enquête avec un artefact déjà innocenté.' },
  { code: 'agent', nom: 'L’Agent Temporel', pouvoir: 'Détection d’anomalie', resume: 'Une fois par partie, choisit une catégorie et découvre une carte qui n’est pas dans la solution.', actif: 'Détection d’anomalie (1 fois)' },
];

export const PERSO_PAR_CODE = Object.fromEntries(PERSOS.map((p) => [p.code, p])) as Record<string, Perso>;

// ---------------------------------------------------------------- Cartes

export const SUSPECTS: Carte[] = PERSOS.map((p) => ({ id: p.code, nom: p.nom.replace(/^L’|^Le /, (m) => (m === 'L’' ? 'L’' : 'Le ')), cat: 'suspect' as const }));

export const ARTEFACTS: Carte[] = [
  { id: 'sceptre', nom: 'Sceptre des Pharaons', cat: 'artefact' },
  { id: 'cristal', nom: 'Cristal Maya', cat: 'artefact' },
  { id: 'couronne', nom: 'Couronne Impériale', cat: 'artefact' },
  { id: 'boussole', nom: 'Boussole Temporelle', cat: 'artefact' },
  { id: 'cle', nom: 'Clé de Babylone', cat: 'artefact' },
  { id: 'fragment', nom: 'Fragment Atlantéen', cat: 'artefact' },
  { id: 'calice', nom: 'Calice de Camelot', cat: 'artefact' },
  { id: 'perle', nom: 'Perle des Abysses', cat: 'artefact' },
  { id: 'sceau', nom: 'Sceau du Dragon', cat: 'artefact' },
  { id: 'disque', nom: 'Disque Solaire', cat: 'artefact' },
];

export const MOBILES: Carte[] = [
  { id: 'avarice', nom: 'Appât du gain', cat: 'mobile' },
  { id: 'pouvoir', nom: 'Recherche du pouvoir', cat: 'mobile' },
  { id: 'vengeance', nom: 'Vengeance', cat: 'mobile' },
  { id: 'protection', nom: 'Protection de l’Histoire', cat: 'mobile' },
  { id: 'catastrophe', nom: 'Empêcher une catastrophe temporelle', cat: 'mobile' },
  { id: 'falsification', nom: 'Falsification du passé', cat: 'mobile' },
];

// ---------------------------------------------------------------- Plateau

export interface Pnj { code: string; nom: string }
export interface Noeud { id: string; nom: string; type: 'lieu' | 'pnj'; x: number; y: number; epoque: string; pnj?: Pnj }

const px = (x: number, y: number) => ({ x: +((x / 1672) * 100).toFixed(2), y: +((y / 941) * 100).toFixed(2) });

export const NOEUDS: Noeud[] = [
  { id: 'eiffel', nom: 'Tour Eiffel', type: 'lieu', epoque: 'Révolution industrielle', ...px(830, 285) },
  { id: 'colisee', nom: 'Colisée de Rome', type: 'lieu', epoque: 'Empire romain', ...px(985, 185) },
  { id: 'pyramides', nom: 'Pyramides de Gizeh', type: 'lieu', epoque: 'Égypte antique', ...px(760, 445) },
  { id: 'chichen', nom: 'Chichén Itzá', type: 'lieu', epoque: 'Civilisation maya', ...px(215, 350) },
  { id: 'muraille', nom: 'Grande Muraille', type: 'lieu', epoque: 'Chine impériale', ...px(1300, 185) },
  { id: 'taj', nom: 'Taj Mahal', type: 'lieu', epoque: 'Empire moghol', ...px(1290, 370) },
  { id: 'petra', nom: 'Petra', type: 'lieu', epoque: 'Royaume nabatéen', ...px(1008, 395) },
  { id: 'machu', nom: 'Machu Picchu', type: 'lieu', epoque: 'Empire inca', ...px(375, 555) },
  { id: 'atlantide', nom: 'Atlantide', type: 'lieu', epoque: 'Temps oubliés', ...px(685, 730) },
  { id: 'bigben', nom: 'Big Ben', type: 'pnj', epoque: 'Ère victorienne', ...px(690, 130), pnj: { code: 'archiviste', nom: 'L’Archiviste Principal' } },
  { id: 'liberte', nom: 'Statue de la Liberté', type: 'pnj', epoque: 'Nouveau Monde', ...px(305, 215), pnj: { code: 'conservateur_general', nom: 'Le Conservateur Général' } },
  { id: 'moai', nom: 'Moaï de l’île de Pâques', type: 'pnj', epoque: 'Océanie ancienne', ...px(135, 690), pnj: { code: 'gardien', nom: 'Le Gardien des Archives' } },
  { id: 'torii', nom: 'Torii de Miyajima', type: 'pnj', epoque: 'Japon féodal', ...px(1565, 265), pnj: { code: 'voyageur', nom: 'Le Voyageur Temporel' } },
  { id: 'opera', nom: 'Opéra de Sydney', type: 'pnj', epoque: 'Monde moderne', ...px(1480, 700), pnj: { code: 'forgeron', nom: 'Le Forgeron Temporel' } },
  { id: 'palais', nom: 'Palais d’Orient', type: 'pnj', epoque: 'Routes de la soie', ...px(1160, 480), pnj: { code: 'bibliothecaire', nom: 'La Bibliothécaire Antique' } },
];

export const NOEUD_PAR_ID = Object.fromEntries(NOEUDS.map((n) => [n.id, n])) as Record<string, Noeud>;

const ARETES: [string, string][] = [
  ['liberte', 'bigben'], ['liberte', 'chichen'], ['bigben', 'eiffel'], ['eiffel', 'colisee'], ['eiffel', 'pyramides'], ['eiffel', 'chichen'],
  ['colisee', 'muraille'], ['colisee', 'petra'], ['muraille', 'torii'], ['muraille', 'taj'], ['torii', 'taj'], ['torii', 'opera'],
  ['taj', 'palais'], ['taj', 'petra'], ['petra', 'palais'], ['petra', 'pyramides'], ['pyramides', 'atlantide'], ['pyramides', 'palais'],
  ['atlantide', 'machu'], ['atlantide', 'opera'], ['atlantide', 'palais'], ['machu', 'chichen'], ['machu', 'moai'], ['palais', 'opera'],
];

export const VOISINS: Record<string, string[]> = Object.fromEntries(NOEUDS.map((n) => [n.id, [] as string[]]));
for (const [a, b] of ARETES) { VOISINS[a].push(b); VOISINS[b].push(a); }

export const DEPART = 'eiffel';

/** Distances en pas depuis `depart`, sans traverser les sites fermés. */
export function distances(depart: string, fermes: readonly string[] = []): Map<string, number> {
  const d = new Map<string, number>([[depart, 0]]);
  const file = [depart];
  while (file.length) {
    const n = file.shift()!;
    for (const v of VOISINS[n]) {
      if (d.has(v) || fermes.includes(v)) continue;
      d.set(v, d.get(n)! + 1);
      file.push(v);
    }
  }
  return d;
}

// ---------------------------------------------------------------- Index des cartes

export const LIEUX: Carte[] = NOEUDS.filter((n) => n.type === 'lieu').map((n) => ({ id: n.id, nom: n.nom, cat: 'lieu' as const }));
export const CARTES: Carte[] = [...SUSPECTS, ...ARTEFACTS, ...LIEUX, ...MOBILES];
export const CARTE_PAR_ID = Object.fromEntries(CARTES.map((c) => [c.id, c])) as Record<string, Carte>;
export const CARTES_PAR_CAT: Record<Categorie, Carte[]> = {
  suspect: SUSPECTS, artefact: ARTEFACTS, lieu: LIEUX, mobile: MOBILES,
};
