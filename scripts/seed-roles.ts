/** Génère le seed SQL de jeux.loupgarou_roles depuis src/lib/jeux/loupgarou/roles.ts (source de vérité). */
import { CATALOGUE } from '../src/lib/jeux/loupgarou/roles';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => `'{${a.join(',')}}'`;

const lignes = CATALOGUE.map(
  (r) =>
    `(${q(r.code)},${q(r.nom)},${q(r.camp)},${q(r.famille)},${q(r.palier)},${r.presence ?? 'null'},${r.poids},${r.score},${r.minJoueurs},${r.ordreNuit ?? 'null'},${r.nuit1Only},${arr(r.tags)},${arr(r.incompatibles)})`,
);

console.log(`insert into jeux.loupgarou_roles
(code, nom, camp, famille, palier, presence, poids, score, min_joueurs, ordre_nuit, nuit1_only, tags, incompatibles) values
${lignes.join(',\n')}
on conflict (code) do update set nom=excluded.nom, camp=excluded.camp, famille=excluded.famille, palier=excluded.palier,
  presence=excluded.presence, poids=excluded.poids, score=excluded.score, min_joueurs=excluded.min_joueurs,
  ordre_nuit=excluded.ordre_nuit, nuit1_only=excluded.nuit1_only, tags=excluded.tags, incompatibles=excluded.incompatibles;`);
