'use client';
import { useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { CarteRole } from '@/components/CarteRole';
import { CATALOGUE } from '@/lib/jeux/loupgarou/roles';
import { CAMPS, ROLES_INFO } from '@/lib/jeux/loupgarou/roles-info';

const FILTRES = [['tous', 'Tous'], ['village', 'Village'], ['loups', 'Loups'], ['solo', 'Solitaires']] as const;

export default function PageRoles() {
  const [f, setF] = useState<string>('tous');
  const liste = useMemo(() => CATALOGUE.filter((r) => f === 'tous' || r.camp === f), [f]);
  return (
    <>
      <div className="fond leger" />
      <Nav />
      <main className="conteneur section">
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
      </main>
    </>
  );
}
