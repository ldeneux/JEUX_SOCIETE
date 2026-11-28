'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { VueJoueur } from '@/lib/jeux/contract';
import { session } from '@/lib/client/api';
import { useCompteARebours, useSalon, useVue } from '@/lib/client/hooks';
import { Actions } from '@/components/Actions';
import { CarteRole } from '@/components/CarteRole';
import { ArchivesJoueur } from '@/components/ArchivesJoueur';
import { CAMPS, ROLES_INFO } from '@/lib/jeux/loupgarou/roles-info';
import { parCode } from '@/lib/jeux/loupgarou/roles';

export default function Telephone() {
  const { code: brut } = useParams<{ code: string }>();
  const code = String(brut).toUpperCase();
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [carteOuverte, setCarteOuverte] = useState(false);

  useEffect(() => {
    session(false).then((s) => (s ? setPret(true) : router.replace(`/jouer?code=${code}`)));
  }, [code, router]);

  const { salon, joueurs, erreur } = useSalon(code);
  const diff = useVue<VueJoueur>(code, 'joueur');
  const secondes = useCompteARebours(diff.echeance);
  const pseudos = useMemo(() => Object.fromEntries(joueurs.map((j) => [j.id, j.pseudo])), [joueurs]);
  const moi = typeof window !== 'undefined' ? localStorage.getItem('rvb-pseudo') : '';
  const vue = diff.vue;

  // L'écran reste allumé pendant la partie.
  useEffect(() => {
    let verrou: { release(): Promise<void> } | null = null;
    const demander = async () => { try { verrou = await (navigator as any).wakeLock?.request('screen'); } catch { /* non supporté */ } };
    demander();
    const v = () => document.visibilityState === 'visible' && demander();
    document.addEventListener('visibilitychange', v);
    return () => { document.removeEventListener('visibilitychange', v); verrou?.release().catch(() => {}); };
  }, []);

  // Vibration quand c'est à toi de jouer ou qu'une info arrive (ex. le grognement du Montreur d'ours).
  const avant = useRef({ ecran: '', infos: 0 });
  useEffect(() => {
    if (!vue) return;
    const infos = vue.secrets.length;
    if ((vue.ecran === 'action' && avant.current.ecran !== 'action') || infos > avant.current.infos) navigator.vibrate?.([90, 50, 90]);
    avant.current = { ecran: vue.ecran, infos };
  }, [vue]);

  if (!pret) return null;
  if (erreur) return <main className="tel"><div className="erreur">{erreur}</div></main>;

  const role = vue?.carte?.code;
  const archives = salon?.jeu_code === 'archives';
  const urgent = secondes !== null && secondes <= 5;

  // « Les Archives du Temps » a sa propre interface (carte, carnet visuel, PNJ), calquée sur la maquette.
  if (archives && vue) {
    return (
      <>
        <div className="fond archives" />
        <main className="tel tel-archives">
          <ArchivesJoueur code={code} vue={vue} version={diff.version} pseudos={pseudos} secondes={secondes} pseudo={moi ?? ''} />
        </main>
      </>
    );
  }

  return (
    <>
      <div className={`fond ${archives ? 'archives' : 'leger'}`} />
      <main className="tel">
        <div className="tel-haut">
          <span className="tel-pseudo">{moi || 'Ravensburg'}</span>
          <span className={`mini-chrono${urgent ? ' urgent' : ''}`}>{secondes !== null && vue && vue.ecran !== 'fin' ? `${secondes}s` : ''}</span>
        </div>

        <div className="tel-centre">
          {!vue && (
            <>
              <div className="lune-grande">🌕</div>
              <h1>Tu es dans le village</h1>
              <p style={{ color: 'var(--doux)' }}>Salon <strong style={{ color: 'var(--or-clair)', letterSpacing: '.2em' }}>{code}</strong> · {joueurs.length} habitant(s).<br />
                {salon?.statut === 'en_cours' ? 'La partie démarre…' : 'En attente du lancement par la console.'}</p>
            </>
          )}

          {vue && (
            <>
              {vue.ecran === 'dors' && <div className="lune-grande">🌙</div>}
              {vue.ecran === 'mort' && <div className="lune-grande">🪦</div>}
              {vue.ecran === 'fin' && <div className="lune-grande">{vue.message?.startsWith('Victoire') ? '🏆' : '🕯️'}</div>}
              <h1>{vue.titre}</h1>
              {vue.message && <div className="message">{vue.message}</div>}
              {vue.actions.length > 0 && <Actions code={code} actions={vue.actions} version={diff.version} pseudos={pseudos} />}
            </>
          )}
        </div>

        {vue && vue.secrets.length > 0 && (
          <details className="tiroir panneau" open={vue.ecran === 'fin'}>
            <summary style={{ cursor: 'pointer', color: 'var(--or-clair)', fontWeight: 600 }}>Mes informations ({vue.secrets.length})</summary>
            <div className="secrets" style={{ marginTop: '.6rem' }}>
              {[...vue.secrets].reverse().map((s, i) => <div key={i}><b>{s.libelle}</b>{s.valeur}</div>)}
            </div>
          </details>
        )}

        {vue && role && (
          <div className="tel-bas">
            <button className="btn btn-bloc" onClick={() => setCarteOuverte(true)}>🎴 Voir ma carte</button>
          </div>
        )}
      </main>

      {carteOuverte && vue && role && (
        <div className="carte-modale" onClick={() => setCarteOuverte(false)} role="dialog" aria-label="Ma carte">
          {(
            <>
              <CarteRole code={role} grande />
              <h2 style={{ margin: 0, color: 'var(--or-clair)' }}>{parCode(role).nom}</h2>
              <p>{ROLES_INFO[role]?.resume}</p>
              <span className="puce">Camp d’origine : {CAMPS[parCode(role).camp]}</span>
            </>
          )}
          <button className="btn btn-or">Cacher ma carte</button>
        </div>
      )}
    </>
  );
}
