/**
 * ÉTAPE 2 : rôles spéciaux. Les rôles passifs (Montreur d'ours, Juge, Servante, Ange, Idiot...)
 * n'ont pas de réveil : leurs règles sont dans deroule.ts (morts, vote, décisions).
 */
import type { Descripteur } from '../contract';
import { parCode } from './roles';
import { choisirJoueurs, info, joueur, vivants, voisins, type Ctx, type JoueurLG } from './etat';
import { acteursAvecRole, enregistrer, etapeDePouvoir, POUVOIRS } from './etapes';

/** Pouvoirs que le Comédien peut tirer au hasard (3 parmi ceux-ci). */
export const POOL_COMEDIEN: string[] = ['voyante', 'salvateur', 'corbeau', 'renard', 'medium'];

const nomsDe = (l: JoueurLG[]) => l.map((x) => x.pseudo).join(', ');

// ------------------------------------------------------------------ Pouvoirs à cible unique

POUVOIRS.corbeau = {
  code: 'corbeau',
  libelle: 'Qui le corbeau désigne-t-il ? (+2 votes demain)',
  cibles: (d, a) => vivants(d).filter((j) => j.id !== a.id),
  appliquer(c, a, cible) {
    c.d.nuitEnCours.corbeau = cible.id;
    info(c, a, 'Corbeau', `Tu désignes ${cible.pseudo} : +2 votes contre lui demain.`);
  },
};

POUVOIRS.renard = {
  code: 'renard',
  libelle: 'Qui flaires-tu ? (lui et ses 2 voisins)',
  cibles: (d, a) => (a.secret.renardPerdu ? [] : vivants(d).filter((j) => j.id !== a.id)),
  appliquer(c, a, cible) {
    if (cible.statuts.includes('heberge')) return info(c, a, 'Flair', `${cible.pseudo} est introuvable cette nuit.`);
    const groupe = [cible, ...voisins(c.d, cible.id)];
    if (groupe.some((x) => x.camp === 'loups')) {
      info(c, a, 'Flair', `Au moins un loup rôde parmi : ${nomsDe(groupe)}.`);
    } else {
      info(c, a, 'Flair', `Aucun loup parmi : ${nomsDe(groupe)}. Ton flair s’éteint à jamais.`);
      a.secret.renardPerdu = true;
    }
  },
};

POUVOIRS.medium = {
  code: 'medium',
  libelle: 'Quel défunt interroges-tu ? (une seule fois)',
  cibles: (d, a) => (a.secret.mediumUtilise ? [] : d.joueurs.filter((j) => !j.vivant)),
  appliquer(c, a, cible) {
    a.secret.mediumUtilise = true;
    info(c, a, 'Médium', `${cible.pseudo} était ${parCode(cible.role).nom}.`);
  },
};

POUVOIRS.aubergiste = {
  code: 'aubergiste',
  libelle: 'Qui héberges-tu cette nuit ?',
  cibles: (d, a) => vivants(d).filter((j) => j.id !== a.id && j.id !== a.secret.dernierHeberge),
  appliquer(c, a, cible) {
    cible.statuts.push('heberge'); // intouchable, mais ne peut pas agir
    c.d.nuitEnCours.heberge = cible.id;
    a.secret.dernierHeberge = cible.id;
    info(c, a, 'Auberge', `${cible.pseudo} dort chez toi cette nuit : intouchable, mais il ne peut pas agir.`);
  },
};

enregistrer(etapeDePouvoir(POUVOIRS.aubergiste, 'aubergiste', 50, 'L’Aubergiste'));
enregistrer(etapeDePouvoir(POUVOIRS.renard, 'renard', 80, 'Le Renard'));
enregistrer(etapeDePouvoir(POUVOIRS.medium, 'medium', 150, 'Le Médium'));
enregistrer(etapeDePouvoir(POUVOIRS.corbeau, 'corbeau', 160, 'Le Corbeau'));

// ------------------------------------------------------------------ Nuit 1 : mise en place

enregistrer({
  code: 'voleur',
  nom: 'Le Voleur',
  ordre: 10,
  nuit1: true,
  declencheurs: ['voleur'],
  acteurs: (d) => acteursAvecRole(d, 'voleur'),
  prompts(d) {
    const extras = d.voleurExtras;
    const oblige = extras.length === 2 && extras.every((r) => parCode(r).camp === 'loups');
    const options = [
      ...(oblige ? [] : [{ valeur: 'garder', libelle: 'Garder mon rôle' }]),
      ...extras.map((r, i) => ({ valeur: `extra:${i}`, libelle: parCode(r).nom })),
    ];
    return options.length ? [{ id: 'carte', type: 'choix', libelle: 'Deux cartes sont posées au centre. Que prends-tu ?', options }] : [];
  },
  repondre(c, j, _id, v) {
    const m = /^extra:(\d)$/.exec(String(v));
    if (!m) return;
    const i = Number(m[1]);
    const ancien = j.role;
    const nouveau = c.d.voleurExtras[i];
    c.d.voleurExtras[i] = ancien;
    j.role = nouveau;
    j.camp = parCode(nouveau).camp;
    info(c, j, 'Vol', `Tu as pris la carte ${parCode(nouveau).nom}.`);
  },
});

enregistrer({
  code: 'enfant_sauvage',
  nom: 'L’Enfant sauvage',
  ordre: 30,
  nuit1: true,
  declencheurs: ['enfant_sauvage'],
  acteurs: (d) => acteursAvecRole(d, 'enfant_sauvage'),
  prompts: (d, j) => [choisirJoueurs('modele', 'Choisis ton modèle', vivants(d).filter((x) => x.id !== j.id), 1, 1)],
  repondre(c, j, _id, v) {
    const m = joueur(c.d, (v as string[])[0])!;
    j.secret.modele = m.id;
    info(c, j, 'Modèle', `Ton modèle est ${m.pseudo}. S’il meurt, tu deviens Loup-garou.`);
  },
});

enregistrer({
  code: 'chien_loup',
  nom: 'Le Chien-loup',
  ordre: 40,
  nuit1: true,
  declencheurs: ['chien_loup'],
  acteurs: (d) => acteursAvecRole(d, 'chien_loup'),
  prompts: () => [{
    id: 'camp', type: 'choix', libelle: 'Quel camp rejoins-tu ?',
    options: [{ valeur: 'village', libelle: 'Le village' }, { valeur: 'loups', libelle: 'Les loups-garous' }],
  }],
  repondre(c, j, _id, v) {
    j.camp = v === 'loups' ? 'loups' : 'village';
    info(c, j, 'Allégeance', v === 'loups' ? 'Tu rejoins la meute.' : 'Tu restes au côté du village.');
  },
});

// ------------------------------------------------------------------ Comédien

enregistrer({
  code: 'comedien',
  nom: 'Le Comédien',
  ordre: 90,
  declencheurs: ['comedien'],
  acteurs: (d) => acteursAvecRole(d, 'comedien'),
  prompts(d, j) {
    const utilises: string[] = j.secret.pouvoirsUtilises ?? [];
    const dispo: string[] = (j.secret.pouvoirs ?? []).filter((p: string) => !utilises.includes(p));
    if (!dispo.length) return [];
    const p: Descripteur[] = [{
      id: 'pouvoir', type: 'choix', libelle: 'Quel pouvoir joues-tu cette nuit ?',
      options: [{ valeur: 'rien', libelle: 'Aucun' }, ...dispo.map((code) => ({ valeur: code, libelle: parCode(code).nom }))],
    }];
    const choisi = d.reponses[j.id]?.pouvoir;
    if (typeof choisi === 'string' && POUVOIRS[choisi]) {
      const cibles = POUVOIRS[choisi].cibles(d, j);
      if (cibles.length) p.push(choisirJoueurs('cible', POUVOIRS[choisi].libelle, cibles, 1, 1));
    }
    return p;
  },
  repondre(c, j, id, v) {
    if (id !== 'cible') return;
    const code = c.d.reponses[j.id]?.pouvoir as string;
    const cible = joueur(c.d, (v as string[])[0]);
    if (!cible || !POUVOIRS[code]) return;
    POUVOIRS[code].appliquer(c, j, cible);
    (j.secret.pouvoirsUtilises ??= []).push(code);
  },
});

// ------------------------------------------------------------------ Loups spéciaux

enregistrer({
  code: 'grand_mechant_loup',
  nom: 'Le Grand Méchant Loup',
  ordre: 101,
  declencheurs: ['grand_mechant_loup'],
  // Seconde victime tant qu'aucun loup n'est mort.
  acteurs: (d) => (d.joueurs.some((x) => !x.vivant && x.camp === 'loups') ? [] : acteursAvecRole(d, 'grand_mechant_loup')),
  prompts(d) {
    const proies = vivants(d).filter((x) => x.camp !== 'loups' && x.id !== d.nuitEnCours.victimeLoups);
    return proies.length ? [choisirJoueurs('cible', 'Choisis une seconde victime', proies, 1, 1)] : [];
  },
  repondre(c, j, _id, v) {
    const cible = joueur(c.d, (v as string[])[0])!;
    c.d.nuitEnCours.victimeGML = cible.id;
    info(c, j, 'Seconde victime', `Tu dévores aussi ${cible.pseudo}.`);
  },
});

enregistrer({
  code: 'infect',
  nom: 'L’Infect Père des Loups',
  ordre: 110,
  declencheurs: ['infect'],
  acteurs: (d) => acteursAvecRole(d, 'infect'),
  prompts(d, j) {
    const v = joueur(d, d.nuitEnCours.victimeLoups);
    if (j.secret.infectUtilise || !v) return [];
    return [{
      id: 'infecter', type: 'choix', libelle: `Infecter ${v.pseudo} au lieu de le laisser mourir ? (une seule fois)`,
      options: [{ valeur: 'non', libelle: 'Non' }, { valeur: 'oui', libelle: 'Oui, infecter' }],
    }];
  },
  repondre(c, j, _id, v) {
    if (v !== 'oui') return;
    c.d.nuitEnCours.infecter = true;
    j.secret.infectUtilise = true;
    info(c, j, 'Infection', 'Ta victime rejoindra la meute, si elle survit à l’attaque.');
  },
});

enregistrer({
  code: 'loup_blanc',
  nom: 'Le Loup blanc',
  ordre: 115,
  nuitsPaires: true,
  declencheurs: ['loup_blanc'],
  acteurs: (d) => acteursAvecRole(d, 'loup_blanc'),
  prompts(d, j) {
    const siens = vivants(d).filter((x) => x.camp === 'loups' && x.id !== j.id);
    return siens.length ? [choisirJoueurs('cible', 'Dévorer l’un des tiens ? (nuits paires)', siens, 0, 1)] : [];
  },
  repondre(c, j, _id, v) {
    const cible = joueur(c.d, (v as string[])[0]);
    if (!cible) return;
    c.d.nuitEnCours.loupBlancCible = cible.id;
    info(c, j, 'Trahison', `Tu t’en prends à ${cible.pseudo}.`);
  },
});

// ------------------------------------------------------------------ Dracula

function corrompre(c: Ctx, dracula: JoueurLG, cible: JoueurLG) {
  cible.statuts = cible.statuts.filter((s) => s !== 'infecte');
  if (!cible.statuts.includes('corrompu')) cible.statuts.push('corrompu');
  cible.camp = 'solo'; // quitte son camp d'origine (et la meute s'il en était), garde son rôle et ses pouvoirs
  info(c, cible, 'Corruption', 'Le Comte Dracula a pris ton âme. Tu gardes ton identité et tes pouvoirs, mais tu sers désormais ses desseins.');
  info(c, dracula, 'Serviteur', `${cible.pseudo} t’appartient désormais.`);
}

enregistrer({
  code: 'dracula',
  nom: 'Le Comte Dracula',
  ordre: 125,
  declencheurs: ['dracula'],
  acteurs: (d) => acteursAvecRole(d, 'dracula'),
  prompts(d, j) {
    const cibles = vivants(d).filter((x) => x.id !== j.id && !x.statuts.includes('corrompu'));
    return cibles.length ? [choisirJoueurs('cible', 'Qui reçoit ta Marque vampirique ?', cibles, 1, 1)] : [];
  },
  repondre(c, j, _id, v) {
    const cible = joueur(c.d, (v as string[])[0])!;
    if (cible.statuts.includes('heberge')) return info(c, j, 'Marque', `${cible.pseudo} est introuvable cette nuit.`);
    const marques: Record<string, number> = (j.secret.marques ??= {});
    marques[cible.id] = (marques[cible.id] ?? 0) + 1;
    if (marques[cible.id] >= c.d.config.marquesPourCorruption) corrompre(c, j, cible);
  },
});

// ------------------------------------------------------------------ Solos

enregistrer({
  code: 'pyromane',
  nom: 'Le Pyromane',
  ordre: 130,
  declencheurs: ['pyromane'],
  acteurs: (d) => acteursAvecRole(d, 'pyromane'),
  prompts(d, j) {
    const options = [{ valeur: 'asperger', libelle: 'Asperger d’essence (1 ou 2 joueurs)' }];
    if (d.joueurs.some((x) => x.vivant && x.statuts.includes('asperge'))) options.push({ valeur: 'embraser', libelle: 'Embraser tous les aspergés' });
    options.push({ valeur: 'rien', libelle: 'Attendre' });
    const p: Descripteur[] = [{ id: 'mode', type: 'choix', libelle: 'Que fais-tu cette nuit ?', options }];
    if (d.reponses[j.id]?.mode === 'asperger') {
      const cibles = vivants(d).filter((x) => x.id !== j.id && !x.statuts.includes('asperge'));
      if (cibles.length) p.push(choisirJoueurs('cibles', 'Qui asperges-tu ?', cibles, 1, Math.min(2, cibles.length)));
    }
    return p;
  },
  repondre(c, j, id, v) {
    if (id === 'mode' && v === 'embraser') {
      c.d.nuitEnCours.feu = true;
      info(c, j, 'Embrasement', 'Tu jettes ta torche : tous les aspergés brûleront à l’aube.');
    }
    if (id === 'cibles') {
      for (const cid of v as string[]) joueur(c.d, cid)!.statuts.push('asperge');
      info(c, j, 'Essence', `Tu as aspergé ${nomsDe((v as string[]).map((x) => joueur(c.d, x)!))}.`);
    }
  },
});

enregistrer({
  code: 'joueur_flute',
  nom: 'Le Joueur de flûte',
  ordre: 140,
  declencheurs: ['joueur_flute'],
  acteurs: (d) => acteursAvecRole(d, 'joueur_flute'),
  prompts(d, j) {
    const cibles = vivants(d).filter((x) => x.id !== j.id && !x.statuts.includes('enchante'));
    return cibles.length ? [choisirJoueurs('cibles', 'Qui enchantes-tu ? (jusqu’à 2)', cibles, 1, Math.min(2, cibles.length))] : [];
  },
  repondre(c, j, _id, v) {
    for (const cid of v as string[]) joueur(c.d, cid)!.statuts.push('enchante');
    info(c, j, 'Enchantement', `Tu as enchanté ${nomsDe((v as string[]).map((x) => joueur(c.d, x)!))}.`);
  },
});
