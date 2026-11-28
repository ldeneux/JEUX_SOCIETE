'use client';
import type { VueConsole } from '@/lib/jeux/contract';
import { imgPerso, imgCarte } from '@/lib/jeux/archives/images';

interface Noeud { id: string; nom: string; type: 'lieu' | 'secondaire'; x: number; y: number; ferme: boolean }
interface Pion { id: string; pseudo: string; perso: string; noeud: string; elimine: boolean }
interface Hyp { auteur: string; suspect: string; artefact: string; lieu: string; mobile: string; refutePar: string | null; resolue: boolean }
type CarteSol = { id: string; nom: string };

const COULEURS = ['#e0b14a', '#5fb07a', '#c0413a', '#6aa6e8', '#a77be0', '#e88a4a'];

/** Console de « Les Archives du Temps » : ta carte du monde est le plateau. Public uniquement. */
export function PlateauArchives({ vue, secondes }: { vue: VueConsole; secondes: number | null }) {
  const noeuds = vue.donnees.noeuds as Noeud[];
  const pions = vue.donnees.pions as Pion[];
  const actif = vue.donnees.actif as string | null;
  const journal = vue.donnees.journal as string[];
  const hyp = vue.donnees.hypothese as Hyp | null;
  const solution = vue.donnees.solution as Record<string, CarteSol> | null;
  const gagnants = new Set(vue.donnees.vainqueurs as string[]);
  const fin = vue.ecran === 'fin';
  const couleur = (id: string) => COULEURS[vue.joueurs.findIndex((j) => j.id === id) % COULEURS.length];
  const parNoeud = new Map<string, Pion[]>();
  for (const p of pions) parNoeud.set(p.noeud, [...(parNoeud.get(p.noeud) ?? []), p]);

  return (
    <>
      <div className="entete-partie">
        <span className="puce">🗺️ {vue.titre}</span>
        <span style={{ color: 'var(--doux)', fontSize: '.9rem' }}>Manche {vue.donnees.manche as number} / {vue.donnees.toursMax as number}</span>
        {secondes !== null && !fin && <span className="chrono">{secondes}</span>}
      </div>

      <div className="arch-grille">
        <div className="arch-carte">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/archives/fond.webp" alt="Carte des Archives du Temps" />
          {noeuds.map((n) => (
            <div key={n.id} className={`noeud ${n.type}${n.ferme ? ' ferme' : ''}`} style={{ left: `${n.x}%`, top: `${n.y}%` }} title={n.nom}>
              <span className="noeud-nom">{n.ferme ? '⛔ ' : n.type === 'secondaire' ? '🗣 ' : ''}{n.nom}</span>
            </div>
          ))}
          {[...parNoeud.entries()].map(([id, liste]) => {
            const n = noeuds.find((x) => x.id === id)!;
            return (
              <div key={id} className="pions" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                {liste.map((p) => (
                  <div key={p.id} className={`pion${actif === p.id ? ' actif' : ''}${p.elimine ? ' elimine' : ''}`} style={{ borderColor: couleur(p.id) }} title={p.pseudo}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgPerso(p.perso)} alt={p.pseudo} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <aside className="arch-cote">
          {hyp && !fin && (
            <div className="panneau hypothese">
              <div className="etiquette">Hypothèse de {hyp.auteur}</div>
              <p>Le coupable serait <b>{hyp.suspect}</b>, avec <b>{hyp.artefact}</b>, à <b>{hyp.lieu}</b> — mobile : <b>{hyp.mobile}</b>.</p>
              <p className="verdict">{!hyp.resolue ? '⏳ Réfutation en cours…' : hyp.refutePar ? `🛡 ${hyp.refutePar} a réfuté (carte montrée en secret).` : '⚠ Personne n’a pu réfuter !'}</p>
            </div>
          )}

          <div className="panneau">
            <div className="etiquette">Enquêteurs</div>
            <ul className="arch-joueurs">
              {vue.joueurs.map((j) => (
                <li key={j.id} className={`${actif === j.id ? 'actif' : ''}${!j.vivant ? ' elimine' : ''}`}>
                  <span className="pastille" style={{ background: couleur(j.id) }} />
                  <span className="nom">{j.pseudo}{gagnants.has(j.id) ? ' 🏆' : ''}</span>
                  <span className="badges">{j.badges.join(' · ')}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panneau journal">
            <div className="etiquette">Journal d’enquête</div>
            <ol>{journal.slice().reverse().map((l, i) => <li key={i} className={i === 0 ? 'recent' : ''}>{l}</li>)}</ol>
          </div>
        </aside>
      </div>

      {fin && solution && (
        <div className="panneau arch-fin">
          <h2>{vue.titre}</h2>
          <p>{vue.donnees.histoire as string}</p>
          <div className="arch-solution">
            {(['suspect', 'artefact', 'lieu', 'mobile'] as const).map((k) => (
              <figure key={k}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgCarte(k, solution[k].id)} alt={solution[k].nom} />
                <figcaption>{solution[k].nom}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
