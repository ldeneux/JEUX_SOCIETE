import type { JeuModule } from './contract';
import { loupgarou } from './loupgarou';
// import { manoir } from './manoir';   // ajouter un jeu = un dossier + une ligne ici

const modules: Record<string, JeuModule<any, any>> = {
  loupgarou,
  // manoir,
};

export function obtenirModule(code: string): JeuModule<any, any> {
  const m = modules[code];
  if (!m) throw new Error(`Jeu inconnu : ${code}`);
  return m;
}

export function catalogue() {
  return Object.values(modules).map((m) => m.manifeste);
}
