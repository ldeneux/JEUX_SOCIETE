/**
 * SIMULATEUR : fait jouer des bots qui choisissent des actions LÉGALES au hasard (celles que
 * proposent les vues), avec des minuteurs qui expirent parfois. Vérifie à chaque pas :
 * pas d'exception, terminaison, cohérence de l'état, aucune fuite dans la vue console.
 */
import { creerRng, type ActionJoueur, type Descripteur } from '../contract';
import { loupgarou, type EtatLG } from './index';

export interface RapportPartie {
  fini: boolean;
  pas: number;
  nuits: number;
  camp: string | null;
  roles: string[];
}

function actionAleatoire(desc: Descripteur[], rng: ReturnType<typeof creerRng>): ActionJoueur | null {
  const d = rng.melanger(desc.filter((x) => x.type !== 'texte'))[0];
  if (!d) return null;
  switch (d.type) {
    case 'joueurs': {
      const k = d.min + rng.entier(d.max - d.min + 1);
      return { id: d.id, valeur: rng.melanger(d.candidats).slice(0, k) };
    }
    case 'choix':
      return { id: d.id, valeur: rng.tirer(d.options).valeur };
    case 'confirmer':
      return { id: d.id, valeur: true };
    default:
      return null;
  }
}

export function verifierEtat(d: EtatLG) {
  const ids = new Set(d.joueurs.map((j) => j.id));
  if (ids.size !== d.joueurs.length) throw new Error('ids dupliqués');
  const maires = d.joueurs.filter((j) => j.maire);
  if (maires.length > 1) throw new Error('plusieurs maires');
  if (maires.some((m) => !m.vivant)) throw new Error('maire mort');
  for (const j of d.joueurs) {
    if (j.statuts.includes('amoureux')) {
      const p = d.joueurs.find((x) => x.id === j.secret.amoureuxDe);
      if (!p) throw new Error('amoureux sans partenaire');
      if (j.vivant !== p.vivant && d.phase !== 'nuit' && d.decisions.length === 0 && d.phase !== 'fin') {
        throw new Error(`amoureux désynchronisés (${j.pseudo}/${p.pseudo})`);
      }
    }
  }
}

export function jouerPartie(
  seed: string,
  mode: string,
  nbJoueurs: number,
  opts: { timeouts?: number; rolesImposes?: string[]; maxPas?: number } = {},
): RapportPartie {
  const rng = creerRng(seed);
  const joueurs = Array.from({ length: nbJoueurs }, (_, i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i }));
  const config = loupgarou.configSchema.parse({ rolesImposes: opts.rolesImposes, leurreSecondes: 0, annonceSecondes: 0 });
  let { etat } = loupgarou.setup({ joueurs, mode, config, rng: creerRng(seed + ':setup') });
  const roles = (etat as EtatLG).joueurs.map((j) => j.role);
  const maxPas = opts.maxPas ?? 4000;
  const proba = opts.timeouts ?? 0.05;

  for (let pas = 0; pas < maxPas; pas++) {
    verifierEtat(etat as EtatLG);
    const fin = loupgarou.resultat(etat);
    if (fin) {
      const d = etat as EtatLG;
      // La vue console ne doit jamais exposer le rôle d'un joueur non révélé.
      const c = loupgarou.vueConsole(etat);
      for (const jc of c.joueurs) {
        const j = d.joueurs.find((x) => x.id === jc.id)!;
        if (!j.roleRevele && jc.badges.some((b) => b === j.role)) throw new Error('fuite console');
      }
      return { fini: true, pas, nuits: d.nuit, camp: d.vainqueur!.camp, roles };
    }
    const att = loupgarou.attente(etat);
    const pasDeRng = creerRng(`${seed}:${pas}`);

    if (att.attendus.length === 0 || pasDeRng.suivant() < proba) {
      etat = loupgarou.avancer(etat, pasDeRng).etat; // minuteur expiré
      continue;
    }
    const id = pasDeRng.tirer(att.attendus);
    const vue = loupgarou.vueJoueur(etat, id);
    const action = actionAleatoire(vue.actions, pasDeRng);
    if (!action) {
      etat = loupgarou.avancer(etat, pasDeRng).etat;
      continue;
    }
    const v = loupgarou.valider(etat, id, action);
    if (!v.ok) throw new Error(`Action proposée mais invalide (${action.id}) : ${v.raison}`);
    etat = loupgarou.appliquer(etat, id, action, pasDeRng).etat;
  }
  return { fini: false, pas: maxPas, nuits: (etat as EtatLG).nuit, camp: null, roles };
}
