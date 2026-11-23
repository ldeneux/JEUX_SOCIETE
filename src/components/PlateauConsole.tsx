'use client';
import type { VueConsole } from '@/lib/jeux/contract';
import { CarteRole } from './CarteRole';

/** Table ronde de la console : les joueurs autour, le récit au centre. Public uniquement. */
export function PlateauConsole({ vue, secondes }: { vue: VueConsole; secondes: number | null }) {
  const joueurs = [...vue.joueurs].sort((a, b) => a.place - b.place);
  const faits = new Set<string>([...((vue.donnees.prets as string[]) ?? []), ...((vue.donnees.aVote as string[]) ?? [])]);
  const annonces = (vue.donnees.annonces as string[]) ?? [];
  const votes = (vue.donnees.dernierVote as { votant: string; cible: string }[] | null) ?? null;
  const fin = vue.ecran === 'fin';
  const roles = (vue.donnees.roles as { id: string; role: string; nom: string }[]) ?? [];
  const gagnants = new Set((vue.donnees.vainqueurs as string[]) ?? []);

  return (
    <>
      <div className={`nuit-voile${vue.ecran === 'nuit' ? ' actif' : ''}`} />
      <div className="entete-partie">
        <span className="puce">{vue.ecran === 'nuit' ? '🌙' : '☀️'} {vue.titre}</span>
        {secondes !== null && !fin && <span className="chrono">{secondes}</span>}
      </div>

      <div className="table">
        {joueurs.map((j, i) => {
          const a = (-90 + (360 * i) / joueurs.length) * (Math.PI / 180);
          const rayon = 43;
          return (
            <div key={j.id} className={`siege${j.vivant ? '' : ' mort'}`} style={{ left: `${50 + rayon * Math.cos(a)}%`, top: `${50 + rayon * Math.sin(a)}%` }}>
              <div className="avatar">
                {j.pseudo.slice(0, 1).toUpperCase()}
                {faits.has(j.id) && <span className="coche">✓</span>}
              </div>
              <span className="nom">{j.pseudo}</span>
              <span className="badges">{j.badges.map((b) => (b === 'maire' ? '👑' : b)).join(' · ')}</span>
            </div>
          );
        })}

        <div className="centre">
          <h2>{vue.titre}</h2>
          {vue.narration && !fin && <div className="narration">{vue.narration}</div>}
          {annonces.length > 0 && !fin && (
            <ul className="annonces">{annonces.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
          {votes && votes.length > 0 && vue.ecran === 'annonce' && (
            <div className="narration" style={{ fontSize: '.8rem', color: 'var(--doux)' }}>
              {votes.map((v) => `${v.votant} → ${v.cible}`).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {fin && (
        <div className="conteneur panneau" style={{ textAlign: 'center' }}>
          <h2>{vue.titre}</h2>
          <div className="fin-roles">
            {roles.map((r) => {
              const j = joueurs.find((x) => x.id === r.id);
              return <div key={r.id} className={gagnants.has(r.id) ? 'gagnant' : ''}>{gagnants.has(r.id) ? '🏆 ' : ''}{j?.pseudo} : {r.nom}</div>;
            })}
          </div>
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            {roles.slice(0, 0).map((r) => <CarteRole key={r.id} code={r.role} />)}
          </div>
        </div>
      )}
    </>
  );
}
