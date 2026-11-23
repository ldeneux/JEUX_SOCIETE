import type { Rng } from './contract';

export const PRENOMS_IA = [
  'Camille', 'Léa', 'Hugo', 'Jules', 'Manon', 'Louis', 'Inès', 'Gabriel', 'Chloé', 'Arthur', 'Alice', 'Raphaël', 'Jade', 'Adam',
  'Louise', 'Lucas', 'Emma', 'Nathan', 'Lina', 'Ethan', 'Zoé', 'Tom', 'Anna', 'Noé', 'Rose', 'Paul', 'Clara', 'Léon',
  'Mila', 'Victor', 'Sarah', 'Théo', 'Eva', 'Maxime', 'Julie', 'Antoine', 'Marion', 'Baptiste', 'Élise', 'Romain', 'Margaux',
  'Clément', 'Océane', 'Quentin', 'Pauline', 'Thibault', 'Justine', 'Axel', 'Mathilde', 'Étienne', 'Capucine', 'Gaspard',
  'Bérénice', 'Aldric', 'Hélène', 'Armand', 'Solène', 'Basile', 'Agathe', 'Lucien', 'Colette', 'Maël', 'Roxane', 'Timothée',
  'Apolline', 'Valentin', 'Salomé', 'Augustin', 'Ondine', 'Cyprien', 'Garance', 'Octave', 'Prune', 'Sacha', 'Yanis', 'Ilona',
];

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** `n` prénoms uniques, distincts (accents et casse ignorés) de ceux déjà pris par les humains. */
export function tirerNomsIA(n: number, pris: string[], rng: Rng): string[] {
  const interdits = new Set(pris.map(norm));
  const noms = rng.melanger(PRENOMS_IA.filter((p) => !interdits.has(norm(p)))).slice(0, n);
  for (let i = 1; noms.length < n; i++) {
    const c = `Villageois ${i}`;
    if (!interdits.has(norm(c))) noms.push(c);
  }
  return noms;
}
