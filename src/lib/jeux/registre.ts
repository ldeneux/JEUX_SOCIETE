import type { JeuModule } from './contract';
import { archives } from './archives';
import { loupgarou } from './loupgarou';

const modules: Record<string, JeuModule<any, any>> = {
  loupgarou,
  archives,
};

export function obtenirModule(code: string): JeuModule<any, any> {
  const m = modules[code];
  if (!m) throw new Error(`Jeu inconnu : ${code}`);
  return m;
}

export function catalogue() {
  return Object.values(modules).map((m) => m.manifeste);
}
