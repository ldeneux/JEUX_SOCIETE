import { describe, expect, it } from 'vitest';
import { creerRng } from './contract';
import { PRENOMS_IA, tirerNomsIA } from './ia-noms';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

describe('prénoms des joueurs IA', () => {
  it('uniques, jamais ceux des humains (casse et accents ignorés)', () => {
    for (let i = 0; i < 200; i++) {
      const humains = ['Léa', 'HUGO', 'élise', 'Camille'];
      const noms = tirerNomsIA(12, humains, creerRng(`n${i}`));
      expect(noms).toHaveLength(12);
      expect(new Set(noms.map(norm)).size).toBe(12);
      for (const h of humains) expect(noms.map(norm)).not.toContain(norm(h));
    }
  });
  it('déterministe, et complète avec des noms génériques si la liste est épuisée', () => {
    expect(tirerNomsIA(5, [], creerRng('a'))).toEqual(tirerNomsIA(5, [], creerRng('a')));
    const beaucoup = tirerNomsIA(PRENOMS_IA.length + 4, [], creerRng('b'));
    expect(new Set(beaucoup).size).toBe(PRENOMS_IA.length + 4);
  });
  it('tous les prénoms tiennent dans un pseudo (≤ 16 caractères)', () => {
    for (const p of PRENOMS_IA) expect(p.length).toBeLessThanOrEqual(16);
  });
});
