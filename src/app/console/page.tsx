'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { appeler, session } from '@/lib/client/api';
import { sb } from '@/lib/client/supabase';
import { CompteurIA } from '@/components/CompteurIA';

interface Manifeste {
  code: string; nom: string; description: string; statut: string;
  joueurs: { min: number; max: number };
  modes: { code: string; nom: string; description: string }[];
  options: { code: string; type: 'booleen' | 'nombre' | 'choix'; libelle: string; defaut: any; min?: number; max?: number }[];
}

export default function Console() {
  const router = useRouter();
  const [connecte, setConnecte] = useState<boolean | null>(null);
  const [jeux, setJeux] = useState<Manifeste[]>([]);
  const [jeu, setJeu] = useState<Manifeste | null>(null);
  const [mode, setMode] = useState('equilibre');
  const [opts, setOpts] = useState<Record<string, any>>({});
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [ia, setIa] = useState(0);

  useEffect(() => {
    session(false).then((s) => setConnecte(!!s));
    fetch('/api/jeux').then((r) => r.json()).then((d) => {
      const dispo = (d.jeux as Manifeste[]).filter((j) => j.statut === 'jouable');
      setJeux(dispo);
      if (dispo[0]) choisir(dispo[0]);
    });
  }, []);

  function choisir(j: Manifeste) {
    setJeu(j);
    setMode(j.modes.find((m) => m.code === 'equilibre')?.code ?? j.modes[0]?.code ?? '');
    setOpts(Object.fromEntries(j.options.map((o) => [o.code, o.defaut])));
  }

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setErreur(''); setOccupe(true);
    const { error } = await sb().auth.signInWithPassword({ email, password: mdp });
    setOccupe(false);
    if (error) return setErreur('Email ou mot de passe incorrect.');
    setConnecte(true);
  }

  async function sansCompte() {
    setErreur('');
    try { await session(true); setConnecte(true); } catch (e) { setErreur((e as Error).message); }
  }

  async function creer() {
    if (!jeu) return;
    setErreur(''); setOccupe(true);
    try {
      const r = await appeler<{ code: string }>('/api/salons', { corps: { jeu: jeu.code, mode, options: { ...opts, ia } } });
      router.push(`/console/${r.code}`);
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  }

  return (
    <>
      <div className="fond vote" />
      <Nav />
      <main className="conteneur section" style={{ maxWidth: 720 }}>
        <div className="etiquette">Console</div>
        <h2>Créer une partie</h2>

        {connecte === null && <p>Chargement…</p>}

        {connecte === false && (
          <form className="panneau" onSubmit={connexion}>
            <p style={{ marginTop: 0, color: 'var(--doux)' }}>Connecte-toi pour piloter la console, ou joue sans compte.</p>
            <label className="champ"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
            <label className="champ"><span>Mot de passe</span><input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required /></label>
            {erreur && <div className="erreur">{erreur}</div>}
            <button className="btn btn-or btn-bloc btn-grand" disabled={occupe}>Se connecter</button>
            <button type="button" className="btn btn-bloc" style={{ marginTop: '.6rem' }} onClick={sansCompte}>Continuer sans compte</button>
          </form>
        )}

        {connecte && jeu && (
          <div className="panneau">
            {jeux.length > 1 && (
              <div className="choix-modes">
                {jeux.map((j) => (
                  <button key={j.code} className={`mode${jeu.code === j.code ? ' actif' : ''}`} onClick={() => choisir(j)}><strong>{j.nom}</strong><small>{j.description}</small></button>
                ))}
              </div>
            )}
            <h3 style={{ fontSize: '1.1rem' }}>{jeu.nom} · {jeu.joueurs.min} à {jeu.joueurs.max} joueurs</h3>
            <div className="choix-modes">
              {jeu.modes.map((m) => (
                <button key={m.code} className={`mode${mode === m.code ? ' actif' : ''}`} onClick={() => setMode(m.code)}>
                  <strong>{m.nom}</strong><small>{m.description}</small>
                </button>
              ))}
            </div>
            <div className="ligne-ia">
              <div><strong>Joueurs IA</strong><small>Complètent la table. Les humains sont toujours prioritaires ; 0 pour jouer entre humains.</small></div>
              <CompteurIA valeur={ia} max={jeu.joueurs.max} onChange={setIa} />
            </div>
            <details>
              <summary style={{ cursor: 'pointer', color: 'var(--or-clair)', marginBottom: '.6rem' }}>Options de la partie</summary>
              {jeu.options.map((o) => (
                <div key={o.code} className="interrupteur">
                  <span>{o.libelle}</span>
                  {o.type === 'booleen' ? (
                    <input type="checkbox" checked={!!opts[o.code]} onChange={(e) => setOpts({ ...opts, [o.code]: e.target.checked })} style={{ width: 24, height: 24 }} />
                  ) : (
                    <input type="number" style={{ width: 100 }} min={o.min} max={o.max} value={opts[o.code] ?? o.defaut} onChange={(e) => setOpts({ ...opts, [o.code]: Number(e.target.value) })} />
                  )}
                </div>
              ))}
            </details>
            {erreur && <div className="erreur">{erreur}</div>}
            <button className="btn btn-or btn-bloc btn-grand" style={{ marginTop: '1rem' }} disabled={occupe} onClick={creer}>Ouvrir le salon</button>
          </div>
        )}
      </main>
    </>
  );
}
