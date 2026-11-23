import { describe, expect, it } from 'vitest';
import { creerRng, type Evenement, type Joueur, type VueConsole, type VueJoueur } from './contract';
import { demarrerPartie, jouerIA, soumettreAction, tick, vuePourJoueur, type Depot, type Deps, type EtatStocke } from './moteur';
import { obtenirModule } from './registre';
import type { EtatLG } from './loupgarou';

function monde(n: number, nbIA = 0) {
  const joueurs: Joueur[] = Array.from({ length: n }, (_, i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i, ia: i >= n - nbIA }));
  let stocke: EtatStocke | null = null;
  const vues = new Map<string, VueJoueur>();
  let console_: VueConsole | null = null;
  let horloge = Date.parse('2026-11-23T20:00:00Z');
  const journal: Evenement[] = [];
  let conflits = 0;

  const depot: Depot = {
    charger: async () => (stocke ? structuredClone(stocke) : null),
    creer: async (_s, s) => { if (stocke) throw new Error('existe'); stocke = { ...s, version: 0 }; },
    sauver: async (_s, v, etat, echeance) => {
      if (!stocke || stocke.version !== v) { conflits++; return false; }
      stocke = { ...stocke, etat: structuredClone(etat), echeance, version: v + 1 };
      return true;
    },
    joueurs: async () => joueurs,
    joueurDeUser: async (_s, u) => (u.startsWith('u-') ? u.slice(2) : null),
    journaliser: async (_s, _v, e) => void journal.push(...e),
  };
  const deps: Deps = {
    depot,
    maintenant: () => horloge,
    diffuseur: {
      console: async (_s, d) => void (console_ = d.vue),
      joueur: async (_s, id, d) => void vues.set(id, d.vue),
    },
  };
  return { joueurs, deps, vues, journal, get stocke() { return stocke!; }, get console() { return console_!; }, get conflits() { return conflits; },
    avancerHorloge: (ms: number) => (horloge += ms), get horloge() { return horloge; } };
}

describe('moteur générique + module Ravensburg (dépôt en mémoire, horloge simulée)', () => {
  it('joue une partie complète via soumettreAction / tick, sans fuite entre téléphones', async () => {
    const m = monde(12);
    const mod = obtenirModule('loupgarou');
    await demarrerPartie(m.deps, 's1', 'loupgarou', 'equilibre', {});
    expect(m.stocke.version).toBeGreaterThan(0);
    expect(m.vues.size).toBe(12);

    const rng = creerRng('moteur-test');
    let pas = 0;
    while (!mod.resultat(m.stocke.etat) && pas++ < 3000) {
      const d = m.stocke.etat as EtatLG;
      // Chaque téléphone ne voit QUE sa propre carte.
      for (const j of d.joueurs) expect(m.vues.get(j.id)!.carte?.code).toBe(j.role);

      const att = mod.attente(m.stocke.etat);
      if (att.attendus.length && rng.suivant() > 0.04) {
        const id = rng.tirer(att.attendus);
        const desc = mod.vueJoueur(m.stocke.etat, id).actions.filter((a) => a.type !== 'texte')[0];
        if (!desc) { m.avancerHorloge(60_000); await tick(m.deps, 's1'); continue; }
        const valeur =
          desc.type === 'joueurs' ? rng.melanger(desc.candidats).slice(0, desc.min + rng.entier(desc.max - desc.min + 1))
          : desc.type === 'choix' ? rng.tirer(desc.options).valeur
          : true;
        await soumettreAction(m.deps, 's1', `u-${id}`, { id: desc.id, valeur });
      } else {
        // personne à attendre (ou minuteur) : l'horloge avance jusqu'à l'échéance, puis tick
        if (m.stocke.echeance) m.avancerHorloge(Math.max(0, Date.parse(m.stocke.echeance) - m.horloge) + 1);
        expect(await tick(m.deps, 's1')).toBe(true);
      }
    }
    expect(mod.resultat(m.stocke.etat)).not.toBeNull();
    expect(m.journal.length).toBeGreaterThan(10);
  }, 120_000);

  it('tick est sans effet avant l’échéance et refuse un état périmé (verrou de version)', async () => {
    const m = monde(8);
    await demarrerPartie(m.deps, 's2', 'loupgarou', 'classique', {});
    const v = m.stocke.version;
    expect(await tick(m.deps, 's2')).toBe(false);
    expect(m.stocke.version).toBe(v);
    // deux ticks concurrents après l'échéance : un seul passe
    m.avancerHorloge(10 * 60_000);
    const [a, b] = await Promise.all([tick(m.deps, 's2'), tick(m.deps, 's2')]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(m.conflits).toBeGreaterThanOrEqual(1);
  });

  async function jouerJusquAuBout(m: ReturnType<typeof monde>, salon: string, seed: string) {
    const mod = obtenirModule('loupgarou');
    const rng = creerRng(seed);
    await jouerIA(m.deps, salon);
    let pas = 0;
    while (!mod.resultat(m.stocke.etat) && pas++ < 4000) {
      const att = mod.attente(m.stocke.etat);
      const humain = att.attendus.find((id) => !m.joueurs.find((j) => j.id === id)!.ia);
      if (humain && rng.suivant() > 0.05) {
        const desc = mod.vueJoueur(m.stocke.etat, humain).actions.filter((a) => a.type !== 'texte')[0];
        if (desc) {
          const valeur =
            desc.type === 'joueurs' ? rng.melanger(desc.candidats).slice(0, desc.min + rng.entier(desc.max - desc.min + 1))
            : desc.type === 'choix' ? rng.tirer(desc.options).valeur
            : true;
          await soumettreAction(m.deps, salon, `u-${humain}`, { id: desc.id, valeur });
          await jouerIA(m.deps, salon);
          continue;
        }
      }
      // plus personne d'humain à attendre (ou minuteur) : l'horloge avance, puis tick
      expect(m.stocke.echeance, 'partie bloquée : ni action attendue ni échéance').not.toBeNull();
      m.avancerHorloge(Math.max(0, Date.parse(m.stocke.echeance!) - m.horloge) + 1);
      await tick(m.deps, salon);
      await jouerIA(m.deps, salon);
    }
    return mod.resultat(m.stocke.etat);
  }

  it('1 humain + 7 IA : la partie va au bout, les IA ne bloquent jamais', async () => {
    const m = monde(8, 7);
    await demarrerPartie(m.deps, 's5', 'loupgarou', 'equilibre', {});
    expect(await jouerJusquAuBout(m, 's5', 'solo-1')).not.toBeNull();
    const d = m.stocke.etat as EtatLG;
    expect(d.joueurs.filter((j) => j.ia)).toHaveLength(7);
  }, 120_000);

  it('mode spectateur : 8 IA seules jouent une partie complète, dans plusieurs modes', async () => {
    for (const [i, mode] of (['classique', 'equilibre', 'chaos'] as const).entries()) {
      const m = monde(8 + i * 4, 8 + i * 4);
      await demarrerPartie(m.deps, `sp${i}`, 'loupgarou', mode, {});
      expect(await jouerJusquAuBout(m, `sp${i}`, `spectateur-${mode}`)).not.toBeNull();
    }
  }, 240_000);

  it('les IA ne jouent jamais à la place d’un humain', async () => {
    const m = monde(8, 4);
    await demarrerPartie(m.deps, 's6', 'loupgarou', 'classique', {});
    await jouerIA(m.deps, 's6');
    const d = m.stocke.etat as EtatLG;
    const att = obtenirModule('loupgarou').attente(m.stocke.etat);
    // tout ce qu'on attend encore est humain (les IA ont déjà joué leur part)
    for (const id of att.attendus) expect(d.joueurs.find((j) => j.id === id)!.ia).toBeFalsy();
  });

  it('refuse le démarrage hors des bornes de joueurs et une action de non-membre', async () => {
    const m = monde(3);
    await expect(demarrerPartie(m.deps, 's3', 'loupgarou', 'equilibre', {})).rejects.toThrow();
    const m2 = monde(8);
    await demarrerPartie(m2.deps, 's4', 'loupgarou', 'classique', {});
    await expect(soumettreAction(m2.deps, 's4', 'intrus', { id: 'cible', valeur: ['j1'] })).rejects.toThrow();
    await expect(vuePourJoueur(m2.deps, 's4', 'intrus')).rejects.toThrow();
  });
});
