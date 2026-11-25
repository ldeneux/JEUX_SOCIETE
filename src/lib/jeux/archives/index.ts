/**
 * MODULE « CLUEDO : LES ARCHIVES DU TEMPS » (code technique : archives) — conforme au contrat JeuModule.
 */
import type { JeuModule, JoueurId, Manifeste, Resultat, SetupCtx, Transition } from '../contract';
import { configSchema, type Config } from './config';
import { iaAR } from './ia';
import { appliquerAR, attenteAR, avancerAR, creerEtat, joueur, validerAR, type Ctx, type EtatAR } from './regles';
import { vueConsoleAR, vueJoueurAR } from './vues';

export { configSchema };
export type { Config, EtatAR };

const manifeste: Manifeste = {
  code: 'archives',
  nom: 'CLUEDO : LES ARCHIVES DU TEMPS',
  description: 'Un artefact a disparu des Archives du Temps. Voyagez de monument en monument, interrogez, déduisez, accusez.',
  visuel: '/archives/fond.webp',
  joueurs: { min: 2, max: 6 },
  dureeMinutes: 45,
  modes: [
    { code: 'classique', nom: 'Enquête classique', description: 'Le premier à trouver la solution l’emporte.' },
    { code: 'course', nom: 'Course contre le temps', description: '12 manches maximum : sinon, les Archives se referment.' },
    { code: 'vivantes', nom: 'Archives vivantes', description: 'Des événements bousculent l’enquête : sites fermés, témoins indiscrets.' },
  ],
  options: [
    { code: 'dureeTourSecondes', type: 'nombre', libelle: 'Durée d’un tour (s)', defaut: 90, min: 20, max: 300 },
    { code: 'toursMax', type: 'nombre', libelle: 'Manches maximum', defaut: 40, min: 4, max: 80 },
    { code: 'pas', type: 'nombre', libelle: 'Déplacement (pas par tour)', defaut: 3, min: 2, max: 6 },
    { code: 'narrationVocale', type: 'booleen', libelle: 'Narration vocale', defaut: true },
  ],
};

const executer = (etat: EtatAR, rng: Ctx['rng'], f: (c: Ctx) => void): Transition<EtatAR> => {
  const c: Ctx = { d: structuredClone(etat), ev: [], rng };
  f(c);
  return { etat: c.d, evenements: c.ev };
};

function resultat(d: EtatAR): Resultat | null {
  if (!d.vainqueur) return null;
  return {
    vainqueurs: d.vainqueur.vainqueurs,
    titre: d.vainqueur.titre,
    resume: d.vainqueur.histoire,
    stats: { manches: d.manche, solution: d.solution, mode: d.mode },
  };
}

export const archives: JeuModule<EtatAR, Config> = {
  manifeste,
  configSchema: configSchema as unknown as JeuModule<EtatAR, Config>['configSchema'],
  setup: ({ joueurs, mode, config, rng }: SetupCtx<Config>) => creerEtat(joueurs, mode, config, rng),
  attente: attenteAR,
  valider: validerAR,
  appliquer: (etat, joueurId: JoueurId, action, rng) => executer(etat, rng, (c) => appliquerAR(c, joueur(c.d, joueurId)!, action)),
  avancer: (etat, rng) => executer(etat, rng, avancerAR),
  vueConsole: vueConsoleAR,
  vueJoueur: vueJoueurAR,
  resultat,
  ia: iaAR,
};
