/**
 * DONNÉES DE « CLUEDO : LES ARCHIVES DU TEMPS » : cartes d'enquête, personnages, PNJ et plateau.
 * Le plateau est la carte du monde : les coordonnées sont en % de l'image 1672×941 (public/archives/fond.webp).
 * 10 suspects · 10 artefacts · 12 lieux principaux (+ 5 sites secondaires) · 10 mobiles · 15 PNJ.
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

export interface Perso { code: string; nom: string; pouvoir: string; resume: string; actif?: string; role: string }

export const PERSOS: Perso[] = [
  { code: 'archeologue', nom: 'L’Archéologue', role: 'Fouilles & stratigraphie', pouvoir: 'Fouilles', resume: 'À sa première visite de chacun des 3 premiers lieux, elle découvre un artefact innocenté.' },
  { code: 'historienne', nom: 'L’Historienne', role: 'Chroniques & archives', pouvoir: 'Érudition', resume: 'Chaque témoignage de PNJ lui livre 2 indices au lieu d’un.' },
  { code: 'explorateur', nom: 'L’Explorateur', role: 'Expéditions lointaines', pouvoir: 'Grandes enjambées', resume: 'Se déplace de 4 pas au lieu de 3.' },
  { code: 'cartographe', nom: 'Le Cartographe', role: 'Routes & méridiens', pouvoir: 'Raccourci temporel', resume: 'Une fois par partie, se rend instantanément sur n’importe quel site.', actif: 'Raccourci temporel (1 fois)' },
  { code: 'conservateur', nom: 'Le Conservateur', role: 'Collections & scellés', pouvoir: 'Inventaire', resume: 'Commence l’enquête avec un artefact déjà innocenté.' },
  { code: 'agent_temporel', nom: 'L’Agent Temporel', role: 'Sauts de ligne temporelle', pouvoir: 'Détection d’anomalie', resume: 'Une fois par partie, choisit une catégorie et découvre une carte qui n’est pas dans la solution.', actif: 'Détection d’anomalie (1 fois)' },
  { code: 'alchimiste', nom: 'L’Alchimiste', role: 'Transmutation & élixirs', pouvoir: 'Distillation', resume: 'Chaque carte qu’on lui montre en réfutation lui livre un indice de plus dans la même catégorie.' },
  { code: 'linguiste', nom: 'La Linguiste', role: 'Langues mortes & glyphes', pouvoir: 'Glyphes', resume: 'Ses témoignages de PNJ sont toujours de la forme « A ou B », ce qui resserre l’enquête.' },
  { code: 'collectionneur', nom: 'Le Collectionneur', role: 'Mécène de pièces rares', pouvoir: 'Cabinet de curiosités', resume: 'Commence l’enquête avec un mobile déjà innocenté.' },
  { code: 'horloger', nom: 'L’Horloger', role: 'Mécanismes de précision', pouvoir: 'Remontage', resume: 'Une fois par partie, après son hypothèse, remonte le temps et se déplace une seconde fois.', actif: 'Remontage (1 fois)' },
];

export const PERSO_PAR_CODE = Object.fromEntries(PERSOS.map((p) => [p.code, p])) as Record<string, Perso>;

// ---------------------------------------------------------------- Cartes

export const SUSPECTS: Carte[] = PERSOS.map((p) => ({ id: p.code, nom: p.nom, cat: 'suspect' as const }));

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
  { id: 'immortalite', nom: 'Quête d’immortalité', cat: 'mobile' },
  { id: 'proche', nom: 'Sauver un proche', cat: 'mobile' },
  { id: 'modifier', nom: 'Modifier le passé', cat: 'mobile' },
  { id: 'sabotage', nom: 'Sabotage des archives', cat: 'mobile' },
];

// ---------------------------------------------------------------- PNJ

export interface Pnj { code: string; nom: string; role: string; /** Catégorie sur laquelle il renseigne le plus volontiers. */ specialite?: Categorie }

export const PNJS: Pnj[] = [
  { code: 'historien', nom: 'L’Historien', role: 'Garantit un alibi chronologique sur un suspect ou un lieu.', specialite: 'suspect' },
  { code: 'bibliothecaire', nom: 'La Bibliothécaire', role: 'Écarte un mobile incohérent avec les registres anciens.', specialite: 'mobile' },
  { code: 'conservateur_loupe', nom: 'Le Conservateur de musée', role: 'Confirme l’absence d’un artefact dans sa chambre forte.', specialite: 'artefact' },
  { code: 'cartographe_globe', nom: 'Le Cartographe', role: 'Connaît les routes : renseigne sur les lieux.', specialite: 'lieu' },
  { code: 'guide', nom: 'Le Guide local', role: 'Indices rapides, parfois partiels.' },
  { code: 'journaliste', nom: 'La Journaliste', role: 'Rumeurs de terrain qui orientent vers un suspect.', specialite: 'suspect' },
  { code: 'marchand', nom: 'Le Marchand de reliques', role: 'Sait quel artefact change de mains.', specialite: 'artefact' },
  { code: 'marin', nom: 'Le Marin', role: 'Les courants mènent droit aux zones d’anomalie.', specialite: 'lieu' },
  { code: 'gardien', nom: 'Le Gardien de temple', role: 'Protège l’accès aux indices des sites fortifiés.', specialite: 'lieu' },
  { code: 'moine', nom: 'Le Moine érudit', role: 'Un acte dicté par la sauvegarde d’un proche a une signature calme.', specialite: 'mobile' },
  { code: 'antiquaire', nom: 'L’Antiquaire', role: 'Distingue les fausses pistes d’artefacts des vraies reliques.', specialite: 'artefact' },
  { code: 'pilleur_de_tombes', nom: 'Le Pilleur de tombes', role: 'Peu bavard, mais ses souvenirs sont exacts.' },
  { code: 'archiviste', nom: 'Le Grand Archiviste', role: 'Offre une déduction de haut niveau.' },
  { code: 'pelerin', nom: 'Le Pèlerin', role: 'Les pierres dressées résonnent quand le passé est menacé.', specialite: 'suspect' },
  { code: 'conteur', nom: 'Le Conteur', role: 'Chaque légende cache un motif humain.', specialite: 'mobile' },
];
export const PNJ_PAR_CODE = Object.fromEntries(PNJS.map((p) => [p.code, p])) as Record<string, Pnj>;

// ---------------------------------------------------------------- Plateau

/** 'lieu' = site d'enquête principal (hypothèses possibles) ; 'secondaire' = relais où l'on ne fait que consulter un témoin. */
export interface Noeud {
  id: string; nom: string; type: 'lieu' | 'secondaire'; x: number; y: number; epoque: string; region: string; role: string; pnj?: string;
}

const px = (x: number, y: number) => ({ x: +((x / 1672) * 100).toFixed(2), y: +((y / 941) * 100).toFixed(2) });

export const NOEUDS: Noeud[] = [
  // 12 lieux principaux
  { id: 'eiffel', nom: 'Tour Eiffel', type: 'lieu', epoque: 'Révolution industrielle', region: 'Paris · France', role: 'Nœud central européen : point de départ de l’enquête.', ...px(869, 290) },
  { id: 'colisee', nom: 'Colisée de Rome', type: 'lieu', epoque: 'Empire romain', region: 'Rome · Italie', role: 'Carrefour méditerranéen entre Europe, Orient et Asie.', pnj: 'conservateur_loupe', ...px(1050, 200) },
  { id: 'pyramides', nom: 'Pyramides de Gizeh', type: 'lieu', epoque: 'Égypte antique', region: 'Gizeh · Égypte', role: 'Cœur de l’Afrique du Nord : relie Atlantide, Orient et Amérique.', pnj: 'historien', ...px(781, 455) },
  { id: 'chichen', nom: 'Chichén Itzá', type: 'lieu', epoque: 'Civilisation maya', region: 'Yucatán · Mexique', role: 'Porte des Amériques.', pnj: 'guide', ...px(184, 345) },
  { id: 'muraille', nom: 'Grande Muraille', type: 'lieu', epoque: 'Chine impériale', region: 'Nord · Chine', role: 'Bastion septentrional : trajet long, forte valeur d’enquête.', pnj: 'gardien', ...px(1366, 215) },
  { id: 'taj', nom: 'Taj Mahal', type: 'lieu', epoque: 'Empire moghol', region: 'Agra · Inde', role: 'Pont vers l’Asie du Sud-Est.', pnj: 'antiquaire', ...px(1343, 395) },
  { id: 'petra', nom: 'Petra', type: 'lieu', epoque: 'Royaume nabatéen', region: 'Ma’an · Jordanie', role: 'Cité taillée dans la roche, relais vers l’Asie.', pnj: 'marchand', ...px(1091, 420) },
  { id: 'machu', nom: 'Machu Picchu', type: 'lieu', epoque: 'Empire inca', region: 'Andes · Pérou', role: 'Citadelle d’altitude, accès à l’Atlantide et au Pacifique.', pnj: 'conteur', ...px(367, 555) },
  { id: 'atlantide', nom: 'Atlantide', type: 'lieu', epoque: 'Temps oubliés', region: 'Abîmes · Atlantique', role: 'Cité engloutie, au centre de l’océan.', pnj: 'archiviste', ...px(706, 755) },
  { id: 'angkor', nom: 'Angkor Wat', type: 'lieu', epoque: 'Empire khmer', region: 'Siem Reap · Cambodge', role: 'Temple khmer englouti par la jungle.', pnj: 'pilleur_de_tombes', ...px(1251, 545) },
  { id: 'stonehenge', nom: 'Stonehenge', type: 'lieu', epoque: 'Préhistoire', region: 'Wessex · Royaume-Uni', role: 'Cercle mégalithique, accès au Nord.', pnj: 'pelerin', ...px(689, 275) },
  { id: 'alexandrie', nom: 'Bibliothèque d’Alexandrie', type: 'lieu', epoque: 'Antiquité hellénistique', region: 'Delta · Égypte', role: 'Sanctuaire du savoir, riche en recoupements.', ...px(947, 415) },
  // 5 sites secondaires
  { id: 'bigben', nom: 'Big Ben', type: 'secondaire', epoque: 'Ère victorienne', region: 'Londres · Royaume-Uni', role: 'Carrefour horloger du Nord.', pnj: 'bibliothecaire', ...px(698, 150) },
  { id: 'liberte', nom: 'Statue de la Liberté', type: 'secondaire', epoque: 'Nouveau Monde', region: 'Côte Est · Amérique', role: 'Relais transatlantique.', pnj: 'marin', ...px(293, 225) },
  { id: 'moai', nom: 'Moaï de l’île de Pâques', type: 'secondaire', epoque: 'Océanie ancienne', region: 'Île de Pâques · Pacifique', role: 'Relais pacifique isolé.', pnj: 'cartographe_globe', ...px(109, 690) },
  { id: 'torii', nom: 'Torii de Miyajima', type: 'secondaire', epoque: 'Japon féodal', region: 'Mer Intérieure · Japon', role: 'Sanctuaire oriental.', pnj: 'moine', ...px(1590, 270) },
  { id: 'opera', nom: 'Opéra de Sydney', type: 'secondaire', epoque: 'Monde moderne', region: 'Port Jackson · Australie', role: 'Avant-poste austral.', pnj: 'journaliste', ...px(1515, 690) },
];

export const NOEUD_PAR_ID = Object.fromEntries(NOEUDS.map((n) => [n.id, n])) as Record<string, Noeud>;
export const pnjDe = (noeudId: string): Pnj | undefined => { const c = NOEUD_PAR_ID[noeudId]?.pnj; return c ? PNJ_PAR_CODE[c] : undefined; };

const ARETES: [string, string][] = [
  ['liberte', 'bigben'], ['liberte', 'chichen'], ['bigben', 'eiffel'], ['bigben', 'stonehenge'], ['stonehenge', 'eiffel'], ['stonehenge', 'chichen'],
  ['eiffel', 'colisee'], ['eiffel', 'alexandrie'], ['eiffel', 'pyramides'], ['chichen', 'pyramides'], ['chichen', 'machu'],
  ['colisee', 'muraille'], ['colisee', 'petra'], ['colisee', 'alexandrie'], ['muraille', 'torii'], ['muraille', 'taj'],
  ['torii', 'taj'], ['torii', 'opera'], ['taj', 'petra'], ['taj', 'angkor'], ['petra', 'alexandrie'], ['alexandrie', 'pyramides'],
  ['pyramides', 'atlantide'], ['pyramides', 'angkor'], ['machu', 'atlantide'], ['machu', 'moai'], ['atlantide', 'angkor'],
  ['atlantide', 'opera'], ['angkor', 'opera'],
];

export const VOISINS: Record<string, string[]> = Object.fromEntries(NOEUDS.map((n) => [n.id, [] as string[]]));
for (const [a, b] of ARETES) { VOISINS[a].push(b); VOISINS[b].push(a); }
export { ARETES };

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
