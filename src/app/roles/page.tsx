'use client';
import { useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { CarteRole } from '@/components/CarteRole';
import { CartePerso } from '@/components/CartePerso';
import { CATALOGUE } from '@/lib/jeux/loupgarou/roles';
import { CAMPS, ROLES_INFO } from '@/lib/jeux/loupgarou/roles-info';
import { PERSOS } from '@/lib/jeux/archives/donnees';

const FILTRES = [['tous', 'Tous'], ['village', 'Village'], ['loups', 'Loups'], ['solo', 'Solitaires']] as const;
const JEUX = [['loupgarou', '🐺 Loup-Garou de Ravensburg'], ['archives', '🕵️ CLUEDO : Les Archives du Temps']] as const;

/** Les rôles dépendent du jeu : cartes de rôle pour le Loup-Garou, enquêteurs (personnages) pour CLUEDO. */
export default function PageRoles() {
  const [jeu, setJeu] = useState<string>('loupgarou');
  const [f, setF] = useState<string>('tous');
  const liste = useMemo(() => CATALOGUE.filter((r) => f === 'tous' || r.camp === f), [f]);
  return (
    <>
      <div className="fond leger" />
      <Nav />
      <main className="conteneur section">
        <div className="filtres">
          {JEUX.map(([k, nom]) => (
            <button key={k} className={`puce filtre${jeu === k ? ' actif' : ''}`} onClick={() => setJeu(k)}>{nom}</button>
          ))}
        </div>

        {jeu === 'loupgarou' ? (
          <>
            <div className="etiquette">Le grimoire</div>
            <h2>Les {CATALOGUE.length} rôles de Ravensburg</h2>
            <div className="filtres">
              {FILTRES.map(([k, nom]) => (
                <button key={k} className={`puce filtre${f === k ? ' actif' : ''}`} onClick={() => setF(k)}>{nom}</button>
              ))}
            </div>
            <div className="grille-roles">
              {liste.map((r) => (
                <div key={r.code} className="fiche-role">
                  <CarteRole code={r.code} />
                  <p><strong>{ROLES_INFO[r.code]?.emoji} {r.nom}</strong> · {CAMPS[r.camp]}</p>
                  <p>{ROLES_INFO[r.code]?.resume}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="etiquette">Le dossier des Archives</div>
            <h2>Les {PERSOS.length} enquêteurs des Archives du Temps</h2>
            <p style={{ color: 'var(--doux)', maxWidth: 640 }}>Chaque enquêteur est aussi un suspect possible. Son pouvoir ne le désigne pas comme coupable : tout le monde peut être innocent.</p>
            <div className="grille-roles">
              {PERSOS.map((p) => (
                <div key={p.code} className="fiche-role">
                  <CartePerso code={p.code} />
                  <p><strong>{p.nom}</strong> · {p.role}</p>
                  <p><b>{p.pouvoir}</b> — {p.resume}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
