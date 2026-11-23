/**
 * MODULE RAVENSBURG (code technique : loupgarou) — conforme au contrat JeuModule.
 */
import type { ActionJoueur, JeuModule, JoueurId, Manifeste, Resultat, SetupCtx, Transition } from '../contract';
import { configSchema, type Config } from './config';
import { composerRoles } from './composition';
import { parCode } from './roles';
import type { Ctx, EtatLG } from './etat';
import { joueur } from './etat';
import { appliquerLG, attenteLG, avancerLG, nouvelleNuit, validerLG } from './deroule';
import { vueConsoleLG, vueJoueurLG } from './vues';
import { POOL_COMEDIEN } from './etapes-speciales';

export { configSchema };
export type { Config, EtatLG };

const manifeste: Manifeste = {
  code: 'loupgarou',
  nom: 'Ravensburg',
  description: 'Le village dort, les loups rôdent, et une fenêtre s’illumine au sommet du château.',
  visuel: '/ravensburg/fond.webp',
  joueurs: { min: 6, max: 30 },
  dureeMinutes: 45,
  modes: [
    { code: 'classique', nom: 'Classique', description: 'Rôles de base, aucun solo.' },
    { code: 'equilibre', nom: 'Équilibré', description: 'Tirage pondéré avec budget d’équilibre.' },
    { code: 'nouveautes', nom: 'Nouveautés', description: 'Favorise les rôles les moins vus.' },
    { code: 'chaos', nom: 'Chaos', description: 'Tout est permis.' },
    { code: 'personnalise', nom: 'Personnalisé', description: 'L’hôte choisit les rôles.' },
  ],
  options: [
    { code: 'dureeDiscussionSecondes', type: 'nombre', libelle: 'Discussion (s)', defaut: 180, min: 30, max: 900 },
    { code: 'maire', type: 'booleen', libelle: 'Élection d’un maire', defaut: true },
    { code: 'votePublic', type: 'booleen', libelle: 'Vote public', defaut: true },
    { code: 'narrationVocale', type: 'booleen', libelle: 'Narration vocale', defaut: true },
    { code: 'reveleRoleDesMorts', type: 'booleen', libelle: 'Révéler le rôle des morts', defaut: true },
    { code: 'marquesPourCorruption', type: 'nombre', libelle: 'Marques avant corruption (Dracula)', defaut: 2, min: 1, max: 4 },
    { code: 'draculaDernierPouvoir', type: 'booleen', libelle: 'Dracula gagne s’il reste le dernier pouvoir occulte', defaut: true },
  ],
};

function setup({ joueurs, mode, config, rng }: SetupCtx<Config>): Transition<EtatLG> {
  const compo = composerRoles({
    nbJoueurs: joueurs.length, mode, imposes: config.rolesImposes, fraicheur: config.fraicheur, rng,
  });
  const distribution = rng.melanger(compo.roles);
  const d: EtatLG = {
    phase: 'nuit',
    nuit: 0,
    joueurs: joueurs.map((j, i) => {
      const role = distribution[i];
      const secret: Record<string, any> = {};
      if (role === 'comedien') secret.pouvoirs = rng.melanger(POOL_COMEDIEN).slice(0, 3);
      return {
        id: j.id, pseudo: j.pseudo, place: j.place,
        roleInitial: role, role, camp: parCode(role).camp,
        vivant: true, maire: false, statuts: [], secret, roleRevele: false,
      };
    }),
    // Les 2 cartes du Voleur restent côté serveur jusqu'à son réveil de la nuit 1.
    voleurExtras: compo.extras,
    reveil: { ordre: [], index: 0 },
    reponses: {},
    nuitEnCours: { votesLoups: {} },
    decisions: [],
    suite: 'jour',
    morts: [],
    annonces: [],
    votes: {},
    pretsVote: [],
    corbeauCible: null,
    secondVote: false,
    chatLoups: [],
    dernierVote: null,
    vainqueur: null,
    mode,
    config,
  };
  const c: Ctx = { d, ev: [], rng };
  nouvelleNuit(c);
  return { etat: c.d, evenements: c.ev };
}

const executer = (etat: EtatLG, rng: Ctx['rng'], f: (c: Ctx) => void): Transition<EtatLG> => {
  const c: Ctx = { d: structuredClone(etat), ev: [], rng };
  f(c);
  return { etat: c.d, evenements: c.ev };
};

function resultat(d: EtatLG): Resultat | null {
  if (!d.vainqueur) return null;
  return {
    vainqueurs: d.vainqueur.vainqueurs,
    titre: d.vainqueur.titre,
    resume: `Partie terminée à la nuit ${d.nuit}.`,
    stats: { nuits: d.nuit, camp: d.vainqueur.camp, roles: d.joueurs.map((j) => ({ id: j.id, role: j.roleInitial })) },
  };
}

export const loupgarou: JeuModule<EtatLG, Config> = {
  manifeste,
  configSchema: configSchema as unknown as JeuModule<EtatLG, Config>['configSchema'],
  setup,
  attente: attenteLG,
  valider: validerLG,
  appliquer: (etat, joueurId: JoueurId, action: ActionJoueur, rng) =>
    executer(etat, rng, (c) => appliquerLG(c, joueur(c.d, joueurId)!, action)),
  avancer: (etat, rng) => executer(etat, rng, avancerLG),
  vueConsole: vueConsoleLG,
  vueJoueur: vueJoueurLG,
  resultat,
};
