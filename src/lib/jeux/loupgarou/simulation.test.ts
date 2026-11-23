import { describe, expect, it } from 'vitest';
import { jouerPartie } from './simulation';
import { CATALOGUE } from './roles';

const TAILLES = [6, 8, 10, 12, 16, 20, 26, 30];

describe('parties complètes par bots (actions légales aléatoires + minuteurs expirés)', () => {
  for (const mode of ['classique', 'equilibre', 'nouveautes', 'chaos'] as const) {
    it(`mode ${mode} : aucune erreur, aucun blocage`, () => {
      const camps: Record<string, number> = {};
      for (const n of TAILLES) {
        for (let i = 0; i < 40; i++) {
          const r = jouerPartie(`${mode}-${n}-${i}`, mode, n);
          expect(r.fini, `blocage seed ${mode}-${n}-${i}`).toBe(true);
          camps[r.camp!] = (camps[r.camp!] ?? 0) + 1;
        }
      }
      console.log(mode, camps);
    }, 240_000);
  }

  it('chaque rôle du catalogue est joué au moins une fois sans erreur (mode personnalisé)', () => {
    for (const r of CATALOGUE) {
      if (r.code === 'villageois' || r.code === 'loup_garou') continue;
      const n = Math.max(10, r.minJoueurs);
      for (let i = 0; i < 25; i++) {
        const res = jouerPartie(`role-${r.code}-${i}`, 'personnalise', n, {
          rolesImposes: ['loup_garou', 'loup_garou', r.code, 'voyante', 'sorciere'],
        });
        expect(res.fini, `blocage ${r.code} seed ${i}`).toBe(true);
      }
    }
  }, 240_000);
});
