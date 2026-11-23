import { describe, expect, it } from 'vitest';
import { creerRng } from '../contract';
import { composerRoles, nombreDeLoups } from './composition';
import { CATALOGUE, estVarianteLoup, parCode } from './roles';

const MODES = ['classique', 'equilibre', 'nouveautes', 'chaos'] as const;
const TAILLES = [6, 7, 8, 9, 10, 12, 14, 16, 18, 22, 26, 30];
const TIRAGES = 150;

function* toutes() {
  for (const mode of MODES)
    for (const n of TAILLES)
      for (let i = 0; i < TIRAGES; i++) {
        const c = composerRoles({ nbJoueurs: n, mode, rng: creerRng(`${mode}-${n}-${i}`) });
        yield { mode, n, c, defs: c.roles.map(parCode) };
      }
}

describe('invariants (tous modes, toutes tailles)', () => {
  it('longueur, villageois, loup simple, nombre de loups', () => {
    for (const { n, c, defs } of toutes()) {
      expect(c.roles).toHaveLength(n);
      expect(c.roles).toContain('villageois');
      expect(c.roles).toContain('loup_garou');
      expect(defs.filter((d) => d.camp === 'loups')).toHaveLength(nombreDeLoups(n));
    }
  });

  it('pas de doublon, min_joueurs et incompatibilités respectés', () => {
    for (const { n, c, defs } of toutes()) {
      const uniques = c.roles.filter((r) => r !== 'villageois' && r !== 'loup_garou');
      expect(new Set(uniques).size).toBe(uniques.length);
      for (const d of defs) {
        expect(d.minJoueurs).toBeLessThanOrEqual(n);
        for (const o of d.incompatibles) expect(c.roles).not.toContain(o);
      }
    }
  });

  it('extras : 2 cartes si et seulement si le Voleur est en jeu', () => {
    for (const { c } of toutes()) expect(c.extras).toHaveLength(c.roles.includes('voleur') ? 2 : 0);
  });

  it('dès 8 joueurs, au moins un rôle d’information ou de protection', () => {
    for (const { n, c, defs } of toutes()) {
      if (n >= 8) expect(defs.some((d) => d.tags.includes('info') || d.tags.includes('protection'))).toBe(true);
    }
  });
});

describe('modes', () => {
  it('classique : uniquement des rôles courants, aucun solo ni variante de loup', () => {
    for (const { mode, defs } of toutes()) {
      if (mode !== 'classique') continue;
      for (const d of defs) {
        expect(['obligatoire', 'courant']).toContain(d.palier);
        expect(d.camp === 'solo' || estVarianteLoup(d)).toBe(false);
      }
    }
  });

  it('équilibré / nouveautés : plafonds chaos et solo', () => {
    for (const { mode, n, defs } of toutes()) {
      if (mode !== 'equilibre' && mode !== 'nouveautes') continue;
      const max = n < 10 ? 1 : 2;
      expect(defs.filter((d) => d.palier === 'chaos').length).toBeLessThanOrEqual(max);
      expect(defs.filter((d) => d.camp === 'solo').length).toBeLessThanOrEqual(max);
    }
  });

  it('équilibré : score proche de 0', () => {
    for (const { mode, c } of toutes()) if (mode === 'equilibre') expect(Math.abs(c.score)).toBeLessThanOrEqual(5);
  });
});

describe('probabilités et fraîcheur', () => {
  const freq = (code: string, opts: Parameters<typeof composerRoles>[0] extends infer T ? Partial<T> : never, n = 1000) => {
    let k = 0;
    for (let i = 0; i < n; i++) {
      const c = composerRoles({ nbJoueurs: 12, mode: 'equilibre', rng: creerRng(`f-${code}-${i}`), ...opts });
      if (c.roles.includes(code)) k++;
    }
    return k / n;
  };

  it('Voyante ≈ 90 % et Sorcière ≈ 65 % en classique', () => {
    const v = freq('voyante', { mode: 'classique' });
    const s = freq('sorciere', { mode: 'classique' });
    expect(v).toBeGreaterThan(0.85);
    expect(s).toBeGreaterThan(0.55);
    expect(s).toBeLessThan(0.9);
  });

  it('un rôle absent depuis longtemps apparaît plus souvent (mode nouveautés)', () => {
    const frais = freq('renard', { mode: 'nouveautes', fraicheur: { renard: 10 } });
    const recent = freq('renard', { mode: 'nouveautes', fraicheur: { renard: 0 } });
    expect(frais).toBeGreaterThan(recent * 1.5);
  });
});

describe('déterminisme et mode personnalisé', () => {
  it('même graine => même composition', () => {
    const a = composerRoles({ nbJoueurs: 14, mode: 'equilibre', rng: creerRng('x') });
    const b = composerRoles({ nbJoueurs: 14, mode: 'equilibre', rng: creerRng('x') });
    expect(a).toEqual(b);
  });

  it('personnalisé : complète en villageois et ajoute un loup si absent, avec avertissements', () => {
    const c = composerRoles({ nbJoueurs: 8, mode: 'personnalise', imposes: ['voyante', 'sorciere'], rng: creerRng('p') });
    expect(c.roles).toHaveLength(8);
    expect(c.roles).toContain('loup_garou');
    expect(c.avertissements.join(' ')).toMatch(/Aucun loup/);
  });

  it('personnalisé : signale incompatibilités et doublons', () => {
    const c = composerRoles({
      nbJoueurs: 10, mode: 'personnalise', rng: creerRng('p2'),
      imposes: ['loup_garou', 'voyante', 'voyante', 'juge', 'ange'],
    });
    const a = c.avertissements.join(' | ');
    expect(a).toMatch(/plusieurs fois/);
    expect(a).toMatch(/incompatibles/);
  });

  it('mode inconnu => erreur', () => {
    expect(() => composerRoles({ nbJoueurs: 8, mode: 'zzz', rng: creerRng('e') })).toThrow();
  });
});

it('catalogue : 29 rôles, codes uniques', () => {
  expect(CATALOGUE).toHaveLength(29);
  expect(new Set(CATALOGUE.map((r) => r.code)).size).toBe(29);
});
