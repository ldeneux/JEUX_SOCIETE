'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { appeler, session } from '@/lib/client/api';

export default function Rejoindre() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('code');
    if (p) setCode(p.toUpperCase().slice(0, 5));
    setPseudo(localStorage.getItem('rvb-pseudo') ?? '');
  }, []);

  async function rejoindre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(''); setOccupe(true);
    try {
      await session(true); // connexion anonyme : aucun compte nécessaire
      const r = await appeler<{ code: string }>(`/api/salons/${code}/rejoindre`, { corps: { pseudo } });
      localStorage.setItem('rvb-pseudo', pseudo);
      router.push(`/jouer/${r.code}`);
    } catch (err) {
      setErreur((err as Error).message);
      setOccupe(false);
    }
  }

  return (
    <>
      <div className="fond" />
      <Nav />
      <main className="conteneur section" style={{ maxWidth: 460 }}>
        <div className="etiquette">Téléphone</div>
        <h2>Rejoindre le village</h2>
        <form className="panneau" onSubmit={rejoindre}>
          <label className="champ"><span>Code de la partie</span>
            <input className="code-saisie" type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
          </label>
          <label className="champ"><span>Ton pseudo</span>
            <input type="text" value={pseudo} maxLength={16} onChange={(e) => setPseudo(e.target.value)} autoComplete="nickname" required />
          </label>
          {erreur && <div className="erreur">{erreur}</div>}
          <button className="btn btn-or btn-bloc btn-grand" disabled={occupe || code.length < 5 || pseudo.trim().length < 2}>Entrer à Ravensburg</button>
        </form>
      </main>
    </>
  );
}
