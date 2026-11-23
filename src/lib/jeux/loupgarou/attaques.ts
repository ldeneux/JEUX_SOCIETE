/**
 * ATTAQUES DE NUIT : calcul pur, partagé par la Sorcière (qui doit voir les morts réels)
 * et par la résolution du matin. Ordre de priorité : Aubergiste > Salvateur > Sorcière (vie) > Ancien > Infection.
 */
import type { JoueurId } from '../contract';
import { joueur, type EtatLG } from './etat';

export type SourceAttaque = 'loups' | 'gml' | 'loup_blanc' | 'poison' | 'feu';
export interface Attaque { cible: JoueurId; source: SourceAttaque }
export type Issue = 'rien' | 'ancien' | 'infecte' | 'mort';

const LOUPISH: SourceAttaque[] = ['loups', 'gml', 'loup_blanc'];
const TOUTES: SourceAttaque[] = ['loups', 'gml', 'loup_blanc', 'poison', 'feu'];

export function collecterAttaques(d: EtatLG, sources: SourceAttaque[] = TOUTES): Attaque[] {
  const n = d.nuitEnCours;
  const a: Attaque[] = [];
  if (sources.includes('loups') && n.victimeLoups) a.push({ cible: n.victimeLoups, source: 'loups' });
  if (sources.includes('gml') && n.victimeGML) a.push({ cible: n.victimeGML, source: 'gml' });
  if (sources.includes('loup_blanc') && n.loupBlancCible) a.push({ cible: n.loupBlancCible, source: 'loup_blanc' });
  if (sources.includes('poison') && n.sorciereMort) a.push({ cible: n.sorciereMort, source: 'poison' });
  if (sources.includes('feu') && n.feu) {
    for (const j of d.joueurs) if (j.vivant && j.statuts.includes('asperge')) a.push({ cible: j.id, source: 'feu' });
  }
  return a;
}

export function issue(d: EtatLG, a: Attaque): Issue {
  const j = joueur(d, a.cible);
  if (!j || !j.vivant) return 'rien';
  if (j.statuts.includes('heberge')) return 'rien';
  const loupish = LOUPISH.includes(a.source);
  if (loupish && d.nuitEnCours.protege === j.id) return 'rien';
  if (loupish && d.nuitEnCours.sorciereVie === j.id) return 'rien';
  if (loupish && j.role === 'ancien' && !j.secret.ancienUtilise) return 'ancien';
  if (a.source === 'loups' && d.nuitEnCours.infecter && a.cible === d.nuitEnCours.victimeLoups && j.camp !== 'loups') {
    return 'infecte';
  }
  return 'mort';
}

export function victimesProjetees(d: EtatLG, sources?: SourceAttaque[]): JoueurId[] {
  const ids = collecterAttaques(d, sources)
    .filter((a) => issue(d, a) === 'mort')
    .map((a) => a.cible);
  return [...new Set(ids)];
}
