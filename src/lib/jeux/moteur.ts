/**
 * MOTEUR GÉNÉRIQUE
 * ----------------
 * Ne connaît aucun jeu. Orchestre : charger l'état -> module -> sauvegarder (CAS) -> diffuser.
 * Dépendances injectées (Depot = Supabase service_role, Diffuseur = Realtime) pour tester sans réseau.
 */
import {
  creerRng,
  type ActionJoueur,
  type Evenement,
  type Joueur,
  type JoueurId,
  type Transition,
  type VueConsole,
  type VueJoueur,
  type JeuModule,
} from './contract';
import { obtenirModule } from './registre';

export interface EtatStocke {
  jeuCode: string;
  mode: string;
  config: unknown;
  etat: unknown;
  version: number;
  echeance: string | null; // ISO
}

export interface Depot {
  charger(salonId: string): Promise<EtatStocke | null>;
  creer(salonId: string, s: Omit<EtatStocke, 'version'>): Promise<void>;
  /** Compare-and-swap : false si la version en base n'est plus `versionAttendue`. */
  sauver(salonId: string, versionAttendue: number, etat: unknown, echeance: string | null): Promise<boolean>;
  joueurs(salonId: string): Promise<Joueur[]>;
  joueurDeUser(salonId: string, userId: string): Promise<JoueurId | null>;
  journaliser(salonId: string, version: number, evenements: Evenement[]): Promise<void>;
}

export interface Diffusion<V> {
  version: number;
  echeance: string | null;
  vue: V;
}

export interface Diffuseur {
  /** Canal public du salon (la console). */
  console(salonId: string, d: Diffusion<VueConsole>): Promise<void>;
  /** Canal privé d'un joueur : un téléphone ne s'abonne qu'au sien. */
  joueur(salonId: string, joueurId: JoueurId, d: Diffusion<VueJoueur>): Promise<void>;
}

export interface Deps {
  depot: Depot;
  diffuseur: Diffuseur;
  maintenant?: () => number; // injectable pour les tests
}

export class ErreurJeu extends Error {
  constructor(public code: 'introuvable' | 'interdit' | 'invalide' | 'conflit', message?: string) {
    super(message ?? code);
  }
}

const MAX_ENCHAINEMENTS = 50; // garde-fou contre une boucle de phases automatiques

// ------------------------------------------------------------------ Cœur

async function persister(
  deps: Deps,
  salonId: string,
  mod: JeuModule<any, any>,
  courant: EtatStocke,
  transition: Transition<unknown>,
): Promise<EtatStocke> {
  const now = deps.maintenant?.() ?? Date.now();
  const version = courant.version + 1;
  let etat = transition.etat;
  const evenements: Evenement[] = [...transition.evenements];

  // Enchaîne les phases qui n'attendent personne et n'ont pas de délai minimum.
  for (let i = 0; i < MAX_ENCHAINEMENTS; i++) {
    if (mod.resultat(etat)) break;
    const att = mod.attente(etat);
    if (att.attendus.length > 0 || (att.delaiMinimumSecondes ?? 0) > 0) break;
    const suite = mod.avancer(etat, creerRng(`${salonId}:${version}:${i}`));
    etat = suite.etat;
    evenements.push(...suite.evenements);
  }

  let echeance: string | null = null;
  if (!mod.resultat(etat)) {
    const att = mod.attente(etat);
    const secondes = att.attendus.length > 0 ? att.dureeSecondes : (att.delaiMinimumSecondes ?? null);
    echeance = secondes === null ? null : new Date(now + secondes * 1000).toISOString();
  }

  const ok = await deps.depot.sauver(salonId, courant.version, etat, echeance);
  if (!ok) throw new ErreurJeu('conflit', 'État modifié entre-temps, réessayer');

  await deps.depot.journaliser(salonId, version, evenements);

  const joueurs = await deps.depot.joueurs(salonId);
  await Promise.all([
    deps.diffuseur.console(salonId, { version, echeance, vue: mod.vueConsole(etat) }),
    ...joueurs.map((j) =>
      deps.diffuseur.joueur(salonId, j.id, { version, echeance, vue: mod.vueJoueur(etat, j.id) }),
    ),
  ]);

  return { ...courant, etat, version, echeance };
}

async function chargerOuErreur(deps: Deps, salonId: string) {
  const s = await deps.depot.charger(salonId);
  if (!s) throw new ErreurJeu('introuvable');
  return { s, mod: obtenirModule(s.jeuCode) };
}

// ------------------------------------------------------------------ API du moteur

/** Appelé par la route serveur quand l'hôte lance la partie depuis la console. */
export async function demarrerPartie(
  deps: Deps,
  salonId: string,
  jeuCode: string,
  mode: string,
  optionsBrutes: unknown,
) {
  const mod = obtenirModule(jeuCode);
  const config = mod.configSchema.parse(optionsBrutes ?? {});
  const joueurs = await deps.depot.joueurs(salonId);
  const { min, max } = mod.manifeste.joueurs;
  if (joueurs.length < min || joueurs.length > max) {
    throw new ErreurJeu('invalide', `${min} à ${max} joueurs requis`);
  }
  if (!mod.manifeste.modes.some((m) => m.code === mode)) throw new ErreurJeu('invalide', 'Mode inconnu');

  const transition = mod.setup({ joueurs, mode, config, rng: creerRng(`${salonId}:setup`) });
  const initial: Omit<EtatStocke, 'version'> = { jeuCode, mode, config, etat: null, echeance: null };
  await deps.depot.creer(salonId, initial);
  return persister(deps, salonId, mod, { ...initial, version: 0 }, transition);
}

/** Appelé par la route serveur quand un téléphone envoie une action. */
export async function soumettreAction(deps: Deps, salonId: string, userId: string, action: ActionJoueur) {
  const { s, mod } = await chargerOuErreur(deps, salonId);
  const joueurId = await deps.depot.joueurDeUser(salonId, userId);
  if (!joueurId) throw new ErreurJeu('interdit');

  const v = mod.valider(s.etat, joueurId, action);
  if (!v.ok) throw new ErreurJeu('invalide', v.raison);

  const transition = mod.appliquer(s.etat, joueurId, action, creerRng(`${salonId}:${s.version}`));
  return persister(deps, salonId, mod, s, transition);
}

/**
 * Fait avancer la partie si l'échéance est dépassée. Idempotent et sans risque d'appel multiple
 * (le CAS écarte les doublons). Déclencheurs : le navigateur de la console à l'échéance,
 * plus un filet de sécurité (pg_cron / Vercel Cron) pour les consoles déconnectées.
 */
export async function tick(deps: Deps, salonId: string): Promise<boolean> {
  const { s, mod } = await chargerOuErreur(deps, salonId);
  const now = deps.maintenant?.() ?? Date.now();
  if (!s.echeance || Date.parse(s.echeance) > now || mod.resultat(s.etat)) return false;
  try {
    await persister(deps, salonId, mod, s, mod.avancer(s.etat, creerRng(`${salonId}:${s.version}`)));
    return true;
  } catch (e) {
    if (e instanceof ErreurJeu && e.code === 'conflit') return false; // un autre tick a gagné
    throw e;
  }
}

/** Reconnexion d'un téléphone : recalcule sa vue depuis l'état serveur. */
export async function vuePourJoueur(deps: Deps, salonId: string, userId: string) {
  const { s, mod } = await chargerOuErreur(deps, salonId);
  const joueurId = await deps.depot.joueurDeUser(salonId, userId);
  if (!joueurId) throw new ErreurJeu('interdit');
  return { version: s.version, echeance: s.echeance, vue: mod.vueJoueur(s.etat, joueurId) };
}

/** Reconnexion de la console (la route vérifie avant que userId = hote_id du salon). */
export async function vuePourConsole(deps: Deps, salonId: string) {
  const { s, mod } = await chargerOuErreur(deps, salonId);
  return { version: s.version, echeance: s.echeance, vue: mod.vueConsole(s.etat) };
}

/**
 * Fait jouer les IA tant que ce sont elles qu'on attend. Les actions de plusieurs IA dans une même phase
 * sont enchaînées en mémoire puis sauvegardées en UNE transition (une seule écriture, une seule diffusion).
 * À appeler après chaque démarrage, action ou tick. Retourne le nombre d'actions jouées.
 */
export async function jouerIA(deps: Deps, salonId: string): Promise<number> {
  let total = 0;
  for (let tour = 0; tour < 80; tour++) {
    const s = await deps.depot.charger(salonId);
    if (!s || s.etat === null || s.etat === undefined) break;
    const mod = obtenirModule(s.jeuCode);
    if (!mod.ia || mod.resultat(s.etat)) break;
    const bots = new Set((await deps.depot.joueurs(salonId)).filter((j) => j.ia).map((j) => j.id));
    if (bots.size === 0) break;

    let etat = s.etat;
    const evenements: Evenement[] = [];
    let agi = 0;
    for (let i = 0; i < 500 && !mod.resultat(etat); i++) {
      const attendus = mod.attente(etat).attendus.filter((id) => bots.has(id));
      let joue = false;
      for (const id of attendus) {
        const rng = creerRng(`${salonId}:ia:${s.version}:${i}:${id}`);
        const action = mod.ia(etat, id, rng);
        if (!action || !mod.valider(etat, id, action).ok) continue; // IA sans action valable : on essaie la suivante
        const t = mod.appliquer(etat, id, action, rng);
        etat = t.etat;
        evenements.push(...t.evenements);
        agi++;
        joue = true;
        break;
      }
      if (!joue) break;
    }
    if (agi === 0) break;
    try {
      await persister(deps, salonId, mod, s, { etat, evenements });
    } catch (e) {
      if (e instanceof ErreurJeu && e.code === 'conflit') continue; // un humain a joué entre-temps : on recalcule
      throw e;
    }
    total += agi;
  }
  return total;
}
