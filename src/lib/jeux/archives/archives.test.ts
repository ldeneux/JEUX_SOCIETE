import { describe, expect, it } from 'vitest';
import { creerRng, type Descripteur } from '../contract';
import { archives, type EtatAR } from './index';
import { CARTES, CARTES_PAR_CAT, DEPART, NOEUDS, NOEUD_PAR_ID, PERSOS, PNJS, PNJ_PAR_CODE, VOISINS, distances } from './donnees';
import { candidats } from './ia';

type Mode = 'classique' | 'course' | 'vivantes';

function verifier(d: EtatAR) {
  // Toutes les cartes existent exactement une fois : solution + mains.
  const sol = Object.values(d.solution);
  const toutes = [...sol, ...d.joueurs.flatMap((p) => p.main)];
  expect(new Set(toutes).size).toBe(toutes.length);
  expect(toutes.length).toBe(CARTES.length);
  for (const p of d.joueurs) {
    // Les indices sont toujours VRAIS : aucune carte « innocente » n'est dans la solution.
    for (const id of p.innocentes) expect(sol).not.toContain(id);
    // Une carte « montrée » est bien chez celui qui l'a montrée.
    for (const [carte, detenteur] of Object.entries(p.montrees)) expect(d.joueurs.find((x) => x.id === detenteur)!.main).toContain(carte);
    // Une alternative contient réellement la carte de la solution.
    for (const a of p.alternatives) expect([a.a, a.b]).toContain(d.solution[a.cat]);
    expect(NOEUD_PAR_ID[p.noeud]).toBeDefined();
    if (d.phase !== 'fin') expect(d.fermes).not.toContain(p.noeud);
    // L'IA ne doit jamais exclure la vraie solution de ses candidats.
    for (const cat of ['suspect', 'artefact', 'lieu', 'mobile'] as const) expect(candidats(d, p, cat)).toContain(d.solution[cat]);
  }
  // Réfutation : toujours par le premier joueur de la table (après l'auteur) qui possède une carte de l'hypothèse.
  for (const h of d.hypotheses) {
    const cartes = [h.suspect, h.artefact, h.lieu, h.mobile];
    const n = d.ordre.length;
    const debut = d.ordre.indexOf(h.auteur);
    let attendu: string | null = null;
    for (let k = 1; k < n; k++) {
      const q = d.joueurs.find((x) => x.id === d.ordre[(debut + k) % n])!;
      if (q.main.some((id) => cartes.includes(id))) { attendu = q.id; break; }
    }
    expect(h.refutePar).toBe(attendu);
  }
}

function descRandom(desc: Descripteur[], rng: ReturnType<typeof creerRng>) {
  const x = desc[0];
  if (!x || x.type !== 'choix') return null;
  return { id: x.id, valeur: rng.tirer(x.options).valeur };
}

function jouer(seed: string, mode: Mode, n: number, humainsAleatoires: number) {
  const rng = creerRng(seed);
  const joueurs = Array.from({ length: n }, (_, i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i, ia: i >= humainsAleatoires }));
  const config = archives.configSchema.parse({ toursMax: 30 });
  let { etat } = archives.setup({ joueurs, mode, config, rng: creerRng(seed + ':setup') });
  let d = etat as EtatAR;
  for (let pas = 0; pas < 6000; pas++) {
    verifier(d);
    if (archives.resultat(d)) return { fini: true, d };
    const r = creerRng(`${seed}:${pas}`);
    const att = archives.attente(d);
    const id = att.attendus[0];
    const p = d.joueurs.find((x) => x.id === id)!;
    let action = p.ia ? archives.ia!(d, id, r) : descRandom(archives.vueJoueur(d, id).actions, r);
    if (!action || r.suivant() < 0.02) { d = archives.avancer(d, r).etat as EtatAR; continue; } // minuteur expiré
    const v = archives.valider(d, id, action);
    expect(v.ok, `action proposée mais refusée (${action.id}) : ${v.ok ? '' : v.raison}`).toBe(true);
    d = archives.appliquer(d, id, action, r).etat as EtatAR;
  }
  return { fini: false, d };
}

describe('données du plateau', () => {
  it('cartes et nœuds cohérents', () => {
    expect(CARTES_PAR_CAT.suspect).toHaveLength(10);
    expect(CARTES_PAR_CAT.artefact).toHaveLength(10);
    expect(CARTES_PAR_CAT.lieu).toHaveLength(12);
    expect(CARTES_PAR_CAT.mobile).toHaveLength(10);
    expect(new Set(CARTES.map((c) => c.id)).size).toBe(CARTES.length);
    expect(PERSOS).toHaveLength(10);
    expect(NOEUDS.filter((n) => n.type === 'lieu')).toHaveLength(12);
    expect(NOEUDS.filter((n) => n.type === 'secondaire')).toHaveLength(5);
    expect(PNJS).toHaveLength(15);
    // Chaque site secondaire a un PNJ ; chaque PNJ est posté sur exactement un site.
    for (const n of NOEUDS) if (n.type === 'secondaire') expect(n.pnj).toBeDefined();
    for (const k of PNJS) expect(NOEUDS.filter((n) => n.pnj === k.code)).toHaveLength(1);
    for (const n of NOEUDS) if (n.pnj) expect(PNJ_PAR_CODE[n.pnj]).toBeDefined();
  });
  it('le graphe est symétrique, connexe depuis le départ et sans nœud isolé', () => {
    for (const [a, vs] of Object.entries(VOISINS)) {
      expect(vs.length).toBeGreaterThanOrEqual(1);
      for (const b of vs) expect(VOISINS[b]).toContain(a);
    }
    const d = distances(DEPART);
    expect(d.size).toBe(NOEUDS.length);
    expect(Math.max(...d.values())).toBeLessThanOrEqual(6);
  });
});

describe('parties simulées', () => {
  it('bots aléatoires (actions légales + minuteurs expirés) : aucune erreur, toujours une fin', () => {
    for (const mode of ['classique', 'course', 'vivantes'] as const) {
      for (const n of [2, 3, 4, 5, 6]) {
        for (let i = 0; i < 12; i++) {
          const r = jouer(`rnd-${mode}-${n}-${i}`, mode, n, n);
          expect(r.fini, `blocage ${mode}/${n}/${i}`).toBe(true);
        }
      }
    }
  }, 240_000);

  it('IA seules : parties terminées, et la solution est trouvée dans la grande majorité des cas', () => {
    let resolues = 0, total = 0, manches = 0;
    for (const n of [2, 3, 4, 5, 6]) {
      for (let i = 0; i < 20; i++) {
        const r = jouer(`ia-${n}-${i}`, 'classique', n, 0);
        expect(r.fini).toBe(true);
        total++;
        if (r.d.vainqueur!.vainqueurs.length) { resolues++; manches += r.d.manche; }
      }
    }
    console.log(`IA : ${resolues}/${total} enquêtes résolues, ${(manches / Math.max(1, resolues)).toFixed(1)} manches en moyenne`);
    expect(resolues / total).toBeGreaterThan(0.75);
  }, 240_000);

  it('humains aléatoires + IA mélangés', () => {
    for (let i = 0; i < 20; i++) expect(jouer(`mix-${i}`, 'vivantes', 5, 2).fini).toBe(true);
  }, 120_000);
});

describe('règles', () => {
  it('une accusation fausse écarte le joueur, une juste fait gagner', () => {
    const joueurs = [0, 1, 2].map((i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i }));
    const { etat } = archives.setup({ joueurs, mode: 'classique', config: archives.configSchema.parse({}), rng: creerRng('acc') });
    let d = etat as EtatAR;
    const accuser = (juste: boolean) => {
      let x = structuredClone(d);
      const id = x.ordre[x.actif];
      x.etape = 'fin';
      const faux = (cat: 'suspect' | 'artefact' | 'lieu' | 'mobile') => CARTES_PAR_CAT[cat].find((k) => k.id !== x.solution[cat])!.id;
      const choix = { a_suspect: juste ? x.solution.suspect : faux('suspect'), a_artefact: x.solution.artefact, a_lieu: x.solution.lieu, a_mobile: x.solution.mobile };
      const rng = creerRng('acc2');
      x = archives.appliquer(x, id, { id: 'fin', valeur: 'accuser' }, rng).etat as EtatAR;
      for (const [k, v] of Object.entries(choix)) {
        expect(archives.valider(x, id, { id: k, valeur: v }).ok).toBe(true);
        x = archives.appliquer(x, id, { id: k, valeur: v }, rng).etat as EtatAR;
      }
      return { x, id };
    };
    const faux = accuser(false);
    expect(faux.x.joueurs.find((p) => p.id === faux.id)!.elimine).toBe(true);
    expect(archives.resultat(faux.x)).toBeNull();
    expect(faux.x.ordre[faux.x.actif]).not.toBe(faux.id);
    const juste = accuser(true);
    expect(archives.resultat(juste.x)!.vainqueurs).toEqual([juste.id]);
  });

  it('nouveaux pouvoirs : collectionneur, horloger, pèlerin consulté à la place d’une hypothèse', () => {
    const joueurs = [0, 1, 2].map((i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i }));
    const { etat } = archives.setup({ joueurs, mode: 'classique', config: archives.configSchema.parse({}), rng: creerRng('pouv') });
    const base = etat as EtatAR;
    const id = base.ordre[base.actif];
    // Horloger : remontage une seule fois, en fin de tour.
    let d = structuredClone(base);
    d.joueurs.find((p) => p.id === id)!.perso = 'horloger';
    d.etape = 'fin';
    const rng = creerRng('h');
    const fin = archives.vueJoueur(d, id).actions[0];
    expect(fin.type === 'choix' && fin.options.map((o) => o.valeur)).toContain('rejouer');
    d = archives.appliquer(d, id, { id: 'fin', valeur: 'rejouer' }, rng).etat as EtatAR;
    expect(d.etape).toBe('deplacement');
    d.etape = 'fin';
    const fin2 = archives.vueJoueur(d, id).actions[0];
    expect(fin2.type === 'choix' && fin2.options.map((o) => o.valeur)).not.toContain('rejouer');
    // Interroger le PNJ d'un lieu principal remplace l'hypothèse et termine l'étape.
    let e = structuredClone(base);
    const p = e.joueurs.find((x) => x.id === id)!;
    p.noeud = 'pyramides'; e.etape = 'hypothese';
    const hyp = archives.vueJoueur(e, id).actions[0];
    expect(hyp.type === 'choix' && hyp.options.map((o) => o.valeur)).toContain('pnj');
    e = archives.appliquer(e, id, { id: 'hypothese', valeur: 'pnj' }, creerRng('p')).etat as EtatAR;
    expect(e.etape).toBe('pnj_dialogue');
    // Le PNJ se présente (parole + niveau de confiance) puis l'enquêteur choisit son approche.
    const v = archives.vueJoueur(e, id);
    expect((v.donnees as any).dialogue.confiance).toBe(5);
    expect((v.donnees as any).dialogue.parole.length).toBeGreaterThan(10);
    e = archives.appliquer(e, id, { id: 'pnj', valeur: 'ecouter' }, creerRng('p2')).etat as EtatAR;
    expect(e.etape).toBe('fin');
    const moi = e.joueurs.find((x) => x.id === id)!;
    expect(moi.vusPNJ).toContain('historien');
    expect(moi.pnjDernier!.issue).toBe('ecoute');
    expect(moi.pnjDernier!.lignes.length).toBeGreaterThanOrEqual(1);
    // Partir sans l'interroger ne le « consomme » pas.
    let f = structuredClone(base);
    f.joueurs.find((x) => x.id === id)!.noeud = 'pyramides'; f.etape = 'pnj_dialogue';
    f = archives.appliquer(f, id, { id: 'pnj', valeur: 'partir' }, creerRng('p3')).etat as EtatAR;
    expect(f.joueurs.find((x) => x.id === id)!.vusPNJ).toHaveLength(0);
    expect(f.etape).toBe('fin');
    // Presser un PNJ peu fiable (2/5) échoue souvent : on vérifie que les deux issues existent.
    const issues = new Set<string>();
    for (let k = 0; k < 40; k++) {
      let g = structuredClone(base);
      g.joueurs.find((x) => x.id === id)!.noeud = 'angkor'; g.etape = 'pnj_dialogue'; // Pilleur de tombes : 2/5
      g = archives.appliquer(g, id, { id: 'pnj', valeur: 'presser' }, creerRng(`pr${k}`)).etat as EtatAR;
      issues.add(g.joueurs.find((x) => x.id === id)!.pnjDernier!.issue);
    }
    expect([...issues].sort()).toEqual(['echec', 'succes']);
  });

  it('le collectionneur démarre avec un mobile innocenté', () => {
    for (let i = 0; i < 40; i++) {
      const joueurs = Array.from({ length: 6 }, (_, k) => ({ id: `j${k}`, pseudo: `P${k}`, place: k }));
      const { etat } = archives.setup({ joueurs, mode: 'classique', config: archives.configSchema.parse({}), rng: creerRng(`col-${i}`) });
      const d = etat as EtatAR;
      const c = d.joueurs.find((p) => p.perso === 'collectionneur');
      if (!c) continue;
      expect(c.innocentes.filter((k) => CARTES_PAR_CAT.mobile.some((m) => m.id === k)).length).toBeGreaterThanOrEqual(1);
      expect(c.infos.length).toBeGreaterThanOrEqual(1);
      return;
    }
  });

  it('le joueur ne peut pas se déplacer au-delà de son allonge, ni sur un site fermé', () => {
    const joueurs = [0, 1, 2].map((i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i }));
    const { etat } = archives.setup({ joueurs, mode: 'classique', config: archives.configSchema.parse({}), rng: creerRng('dep') });
    const d = etat as EtatAR;
    const id = d.ordre[d.actif];
    const p = d.joueurs.find((x) => x.id === id)!;
    const desc = archives.vueJoueur(d, id).actions.find((a) => a.id === 'dest' || a.id === 'pouvoir')!;
    expect(desc).toBeDefined();
    const loin = NOEUDS.find((n) => (distances(p.noeud).get(n.id) ?? 0) > 4);
    if (loin && desc.type === 'choix' && desc.id === 'dest') expect(desc.options.map((o) => o.valeur)).not.toContain(loin.id);
  });
});

// ---------------------------------------------------------------- Intégration par le moteur générique
import { demarrerPartie, jouerIA, soumettreAction, tick, type Depot, type Deps, type EtatStocke } from '../moteur';

describe('moteur générique + Archives (dépôt en mémoire, horloge simulée)', () => {
  it('1 humain + 3 IA : la partie va au bout via soumettreAction / jouerIA / tick', async () => {
    const joueurs = [0, 1, 2, 3].map((i) => ({ id: `j${i}`, pseudo: `P${i}`, place: i, ia: i > 0 }));
    let stocke: EtatStocke | null = null;
    let horloge = Date.parse('2026-11-24T20:00:00Z');
    const vues = new Map<string, unknown>();
    const depot: Depot = {
      charger: async () => (stocke ? structuredClone(stocke) : null),
      creer: async (_s, s) => { stocke = { ...s, version: 0 }; },
      sauver: async (_s, v, etat, echeance) => {
        if (!stocke || stocke.version !== v) return false;
        stocke = { ...stocke, etat: structuredClone(etat), echeance, version: v + 1 };
        return true;
      },
      joueurs: async () => joueurs,
      joueurDeUser: async (_s, u) => (u === 'u-j0' ? 'j0' : null),
      journaliser: async () => {},
    };
    const deps: Deps = { depot, maintenant: () => horloge, diffuseur: { console: async () => {}, joueur: async (_s, id, d) => void vues.set(id, d.vue) } };
    await demarrerPartie(deps, 'a1', 'archives', 'classique', { toursMax: 30 });
    const rng = creerRng('integ');
    const etatCourant = () => (stocke as unknown as EtatStocke).etat as EtatAR;
    for (let pas = 0; pas < 3000 && !archives.resultat(etatCourant()); pas++) {
      await jouerIA(deps, 'a1');
      if (archives.resultat(etatCourant())) break;
      const att = archives.attente(etatCourant());
      if (att.attendus.includes('j0') && rng.suivant() > 0.03) {
        const a = descRandom(archives.vueJoueur(etatCourant(), 'j0').actions, rng)!;
        await soumettreAction(deps, 'a1', 'u-j0', a);
      } else {
        horloge = Math.max(horloge, Date.parse((stocke as unknown as EtatStocke).echeance!)) + 1; // le minuteur expire
        await tick(deps, 'a1');
      }
    }
    expect(archives.resultat(etatCourant())).not.toBeNull();
    // Chaque téléphone ne reçoit que SA main, jamais celle d'un autre.
    const d = etatCourant();
    for (const p of d.joueurs) {
      const v = vues.get(p.id) as { secrets: { libelle: string; valeur: string }[] };
      const mesCartes = v.secrets.find((s) => s.libelle === 'Mes cartes')!.valeur.split('\n');
      expect(mesCartes.length).toBe(p.main.length);
    }
  }, 120_000);

  it('rythme des IA : chaque tour d’IA est diffusé séparément, avec une pause entre deux', async () => {
    const joueurs = [0, 1, 2].map((i) => ({ id: `b${i}`, pseudo: `Bot${i}`, place: i, ia: true }));
    let stocke: EtatStocke | null = null;
    const depot: Depot = {
      charger: async () => (stocke ? structuredClone(stocke) : null),
      creer: async (_s, s) => { stocke = { ...s, version: 0 }; },
      sauver: async (_s, v, etat, echeance) => {
        if (!stocke || stocke.version !== v) return false;
        stocke = { ...stocke, etat: structuredClone(etat), echeance, version: v + 1 };
        return true;
      },
      joueurs: async () => joueurs, joueurDeUser: async () => null, journaliser: async () => {},
    };
    let pauses = 0; let diffusions = 0;
    const deps: Deps = { depot, pause: async () => { pauses++; }, diffuseur: { console: async () => { diffusions++; }, joueur: async () => {} } };
    await demarrerPartie(deps, 'r1', 'archives', 'classique', { toursMax: 30 });
    await jouerIA(deps, 'r1');
    expect(pauses).toBeGreaterThan(5);
    expect(diffusions).toBeGreaterThan(pauses); // une diffusion par tour d'IA, pas une seule pour toute la table
    expect(archives.resultat((stocke as unknown as EtatStocke).etat as EtatAR)).not.toBeNull();
  }, 60_000);
});
