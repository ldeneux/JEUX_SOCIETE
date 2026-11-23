/**
 * VUES : la SEULE sortie du moteur vers les écrans.
 * vueJoueur(A) ne contient que ce que A a le droit de savoir ; vueConsole que du public.
 */
import type { VueConsole, VueJoueur } from '../contract';
import { parCode } from './roles';
import { descripteursLG, etapeCourante } from './deroule';
import { joueur, type EtatLG, type JoueurLG } from './etat';

function secretsDe(d: EtatLG, j: JoueurLG): VueJoueur['secrets'] {
  const s: VueJoueur['secrets'] = [...(j.secret.infos ?? [])];
  const noms = (l: JoueurLG[]) => l.map((x) => x.pseudo + (x.vivant ? '' : ' †')).join(', ');
  if (j.camp === 'loups') {
    s.unshift({ libelle: 'Meute', valeur: noms(d.joueurs.filter((x) => x.camp === 'loups' && x.id !== j.id)) || 'Tu es seul' });
  }
  if (j.statuts.includes('enchante')) {
    s.unshift({ libelle: 'Enchantés', valeur: noms(d.joueurs.filter((x) => x.statuts.includes('enchante'))) });
  }
  if (j.role === 'comedien') {
    const dejaUtilises: string[] = j.secret.pouvoirsUtilises ?? [];
    const restants = ((j.secret.pouvoirs ?? []) as string[]).filter((p) => !dejaUtilises.includes(p)).map((p) => parCode(p).nom);
    s.unshift({ libelle: 'Pouvoirs restants', valeur: restants.join(', ') || 'Aucun' });
  }
  if (j.role === 'dracula') {
    const marques = Object.entries((j.secret.marques ?? {}) as Record<string, number>)
      .filter(([id]) => joueur(d, id)?.vivant && !joueur(d, id)!.statuts.includes('corrompu'))
      .map(([id, n]) => `${joueur(d, id)!.pseudo} (${n})`);
    s.unshift({ libelle: 'Marques', valeur: marques.join(', ') || 'Aucune' });
    s.unshift({ libelle: 'Serviteurs', valeur: noms(d.joueurs.filter((x) => x.statuts.includes('corrompu'))) || 'Aucun' });
  }
  if (j.statuts.includes('corrompu')) {
    const c = d.joueurs.find((x) => x.role === 'dracula');
    s.unshift({ libelle: 'Le Comte', valeur: c ? `${c.pseudo}${c.vivant ? '' : ' †'}` : 'Dracula' });
  }
  return s;
}

export function vueJoueurLG(d: EtatLG, id: string): VueJoueur {
  const j = joueur(d, id);
  if (!j) throw new Error('Joueur inconnu');
  const carte = { code: j.role, nom: parCode(j.role).nom };
  const secrets = secretsDe(d, j);
  const actions = descripteursLG(d, j);

  if (d.phase === 'fin') {
    const gagne = d.vainqueur!.vainqueurs.includes(id);
    const revele = d.joueurs.map((x) => `${x.pseudo} : ${parCode(x.roleInitial).nom}`).join('\n');
    return {
      ecran: 'fin', titre: d.vainqueur!.titre, message: gagne ? 'Victoire !' : 'Défaite…', carte,
      secrets: [{ libelle: 'Les rôles de la partie', valeur: revele }, ...secrets], actions: [],
    };
  }
  if (!j.vivant && actions.length === 0) {
    return { ecran: 'mort', titre: 'Tu es éliminé', message: 'Observe en silence : le village compte sur les vivants.', carte, secrets, actions: [] };
  }

  switch (d.phase) {
    case 'nuit': {
      if (actions.length) {
        let message: string | undefined;
        if (etapeCourante(d)?.code === 'loups') {
          const votes = Object.entries(d.nuitEnCours.votesLoups).map(([v, c]) => `${joueur(d, v)!.pseudo} → ${joueur(d, c)!.pseudo}`);
          const chat = d.chatLoups.map((m) => `${m.de} : ${m.texte}`);
          message = [...votes, ...chat].join('\n') || undefined;
        }
        return { ecran: 'action', titre: 'À toi de jouer', message, carte, secrets, actions };
      }
      // IDENTIQUE pour tous les rôles : un écran différent trahirait qui est réveillé.
      const fragments = j.role === 'petite_fille' && j.vivant ? d.chatLoups.map((m) => m.masque).join('\n') : undefined;
      return { ecran: 'dors', titre: 'Le village dort…', message: fragments, carte, secrets, actions: [] };
    }
    case 'annonce':
      return { ecran: 'annonce', titre: d.suite === 'jour' ? 'Le jour se lève' : 'Le village a parlé', message: d.annonces.join('\n'), carte, secrets, actions: [] };
    case 'decision':
      return actions.length
        ? { ecran: 'action', titre: 'Dernier souffle', carte, secrets, actions }
        : { ecran: 'attente', titre: 'Le village retient son souffle…', carte, secrets, actions: [] };
    default: {
      const titres = { election: 'Élection du maire', discussion: 'Débat du village', vote: 'Vote du village' } as const;
      return { ecran: actions.length ? 'action' : 'attente', titre: titres[d.phase as keyof typeof titres], carte, secrets, actions };
    }
  }
}

export function vueConsoleLG(d: EtatLG): VueConsole {
  const e = etapeCourante(d);
  const dec = d.decisions[0];
  const titres: Record<string, string> = {
    nuit: `Nuit ${d.nuit}`,
    annonce: d.suite === 'jour' ? 'Le jour se lève' : 'Le village a parlé',
    decision: 'Dernier souffle',
    election: 'Élection du maire',
    discussion: 'Débat du village',
    vote: 'Vote du village',
    fin: d.vainqueur?.titre ?? 'Fin',
  };
  let narration: string | undefined;
  if (d.phase === 'nuit') {
    narration = d.reveil.index === 0 ? `La nuit tombe sur Ravensburg. ${e!.nom}, réveille-toi.` : `${e!.nom}, réveille-toi.`;
  } else if (d.phase === 'annonce') narration = d.annonces.join(' ');
  else if (d.phase === 'decision' && dec) narration = `${joueur(d, dec.acteur)!.pseudo} doit faire un choix.`;
  else if (d.phase === 'fin') narration = d.vainqueur!.titre;

  return {
    ecran: d.phase,
    titre: titres[d.phase],
    narration,
    joueurs: d.joueurs.map((j) => ({
      id: j.id,
      pseudo: j.pseudo,
      place: j.place,
      vivant: j.vivant,
      badges: [j.maire ? 'maire' : '', j.roleRevele ? parCode(j.role).nom : '', j.statuts.includes('gracie') ? 'gracié' : '', d.phase === 'fin' && j.ia ? '🤖' : ''].filter(Boolean),
    })),
    donnees: {
      nuit: d.nuit,
      etape: d.phase === 'nuit' ? e!.nom : null,
      annonces: d.annonces,
      dernierVote: d.dernierVote,
      prets: d.phase === 'discussion' ? d.pretsVote : [],
      aVote: d.phase === 'vote' || d.phase === 'election' ? Object.keys(d.votes) : [],
      roles: d.phase === 'fin' ? d.joueurs.map((j) => ({ id: j.id, role: j.roleInitial, nom: parCode(j.roleInitial).nom })) : [],
      vainqueurs: d.phase === 'fin' ? d.vainqueur!.vainqueurs : [],
    },
  };
}
