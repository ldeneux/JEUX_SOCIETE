import { describe, expect, it } from 'vitest';
import { creerRng, type Evenement, type Joueur, type VueConsole, type VueJoueur } from './contract';
import { demarrerPartie, soumettreAction, tick, vuePourJoueur, type Depot, type Deps, type EtatStocke } from './moteur';
import { obtenirModule } from './registre';
import type { EtatLG } from './loupgarou';

function monde(n: number) {
  const joueurs: Joueur[] = Array.from({ length: n }, (_, i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i }));
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

  it('refuse le démarrage hors des bornes de joueurs et une action de non-membre', async () => {
    const m = monde(3);
    await expect(demarrerPartie(m.deps, 's3', 'loupgarou', 'equilibre', {})).rejects.toThrow();
    const m2 = monde(8);
    await demarrerPartie(m2.deps, 's4', 'loupgarou', 'classique', {});
    await expect(soumettreAction(m2.deps, 's4', 'intrus', { id: 'cible', valeur: ['j1'] })).rejects.toThrow();
    await expect(vuePourJoueur(m2.deps, 's4', 'intrus')).rejects.toThrow();
  });
});
