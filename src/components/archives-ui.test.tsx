import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { creerRng } from '@/lib/jeux/contract';
import { archives, type EtatAR } from '@/lib/jeux/archives';
import { PlateauArchives } from './PlateauArchives';
import { CarnetArchives, type DonneesCarnet } from './CarnetArchives';
import { CartePerso } from './CartePerso';
import { ArchivesJoueur } from './ArchivesJoueur';

describe('rendu des écrans Archives avec de vraies données', () => {
  it('console, carnet et carte de personnage', () => {
    const joueurs = [0, 1, 2, 3].map((i) => ({ id: `j${i}`, pseudo: `Joueur${i}`, place: i }));
    const { etat } = archives.setup({ joueurs, mode: 'vivantes', config: archives.configSchema.parse({}), rng: creerRng('ui') });
    const d = etat as EtatAR;
    const html = renderToString(<PlateauArchives vue={archives.vueConsole(d)} secondes={42} />);
    expect(html).toContain('Tour Eiffel');
    expect(html).toContain('Big Ben');
    expect(html).toContain('Bibliothèque d’Alexandrie');
    expect(html).toContain('Journal d’enquête');
    for (const j of joueurs) expect(html).toContain(j.pseudo);
    const vue = archives.vueJoueur(d, 'j0');
    const carnet = renderToString(<CarnetArchives donnees={vue.donnees as unknown as DonneesCarnet} />);
    expect(carnet).toContain('Suspects');
    expect(carnet).toContain('Artefacts');
    expect(renderToString(<CartePerso code={vue.carte!.code} grande />)).toContain('/archives/persos/');
    // Le carnet est visuel : une vignette (image) par carte, 42 cartes en tout.
    expect((carnet.match(/class="vignette/g) ?? []).length).toBe(42);
    expect(carnet).toContain('/archives/lieux/');
    expect(carnet).toContain('/archives/motifs/');
    // Interface joueur complète : bandeau, onglets, carte du monde, inspecteur.
    const tel = renderToString(<ArchivesJoueur code="ABCD" vue={vue} version={1} pseudos={{ j0: 'Joueur0' }} secondes={30} pseudo="Joueur0" />);
    for (const t of ['Les Archives du Temps', 'Camp de base', 'Enquêteur', 'Carte', 'Carnet', 'Indices', 'Mes cartes', 'manches']) expect(tel).toContain(t);
    // Le carnet d'un joueur ne contient JAMAIS la solution comme « main » d'un autre : la solution reste invisible.
    expect(JSON.stringify(vue)).not.toContain('"solution"');
    expect(JSON.stringify(archives.vueConsole(d))).not.toContain(`"id":"${d.solution.suspect}","nom"`);
  });
});
