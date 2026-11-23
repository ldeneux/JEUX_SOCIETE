'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import type { VueConsole } from '@/lib/jeux/contract';
import { appeler, session } from '@/lib/client/api';
import { useCompteARebours, useSalon, useVue } from '@/lib/client/hooks';
import { PlateauConsole } from '@/components/PlateauConsole';

export default function ConsolePartie() {
  const { code: brut } = useParams<{ code: string }>();
  const code = String(brut).toUpperCase();
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [voix, setVoix] = useState(true);
  const [manifeste, setManifeste] = useState<{ nom: string; joueurs: { min: number; max: number }; modes: { code: string; nom: string }[] } | null>(null);

  useEffect(() => {
    session(false).then((s) => (s ? setPret(true) : router.replace('/console')));
  }, [router]);
  useEffect(() => {
    fetch('/api/jeux').then((r) => r.json()).then((d) => setManifeste(d.jeux[0]));
  }, []);

  const { salon, joueurs, erreur: erreurSalon } = useSalon(code);
  const diff = useVue<VueConsole>(code, 'console');
  const secondes = useCompteARebours(diff.echeance);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/jouer?code=${code}` : '';

  // Minuteurs : la console déclenche l'avancement à l'échéance (idempotent côté serveur).
  useEffect(() => {
    if (!diff.echeance || !diff.vue || salon?.statut === 'terminee') return;
    let timer: ReturnType<typeof setTimeout>;
    let essais = 0;
    const tirer = () => {
      appeler(`/api/salons/${code}/tick`, { method: 'POST', corps: {} }).catch(() => {}).finally(() => {
        if (++essais < 8) timer = setTimeout(tirer, 2500);
      });
    };
    timer = setTimeout(tirer, Math.max(0, Date.parse(diff.echeance) - Date.now()) + 300 + Math.random() * 400);
    return () => clearTimeout(timer);
  }, [diff.echeance, diff.version, diff.vue, code, salon?.statut]);

  // Narration vocale (Web Speech API). Nécessite un geste utilisateur préalable : le bouton « Lancer » en est un.
  const dernier = useRef(-1);
  useEffect(() => {
    if (!voix || !diff.vue?.narration || diff.version === dernier.current || typeof speechSynthesis === 'undefined') return;
    dernier.current = diff.version;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(diff.vue.narration);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('fr'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }, [diff.vue, diff.version, voix]);

  const lancer = useCallback(async () => {
    setErreur(''); setOccupe(true);
    try {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.speak(new SpeechSynthesisUtterance('')); // déverrouille l'audio
      await appeler(`/api/salons/${code}/demarrer`, { method: 'POST', corps: {} });
      diff.rafraichir();
    } catch (e) { setErreur((e as Error).message); }
    setOccupe(false);
  }, [code, diff]);

  if (!pret) return null;
  if (erreurSalon) return <main className="conteneur section"><div className="erreur">{erreurSalon}</div></main>;

  // ----- Partie en cours
  if (diff.vue) {
    return (
      <>
        <div className="fond leger" />
        <main className="conteneur plateau">
          <PlateauConsole vue={diff.vue} secondes={secondes} />
          <button className="btn" style={{ position: 'fixed', bottom: 'calc(.8rem + var(--bas))', left: '1rem', minHeight: 40, padding: '.4rem .9rem' }} onClick={() => { setVoix(!voix); speechSynthesis?.cancel(); }}>
            {voix ? '🔊' : '🔇'}
          </button>
          {diff.vue.ecran === 'fin' && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn btn-or btn-grand" onClick={() => router.push('/console')}>Nouvelle partie</button>
            </div>
          )}
        </main>
      </>
    );
  }

  // ----- Salle d'attente
  const min = manifeste?.joueurs.min ?? 6;
  const max = manifeste?.joueurs.max ?? 30;
  const modeNom = manifeste?.modes.find((m) => m.code === salon?.mode)?.nom ?? salon?.mode;
  return (
    <>
      <div className="fond" />
      <main className="conteneur salon">
        <div className="entete-partie">
          <span className="marque">Ravensburg</span>
          <span className="puce">{modeNom}</span>
        </div>
        <div className="salon-corps">
          <div className="panneau" style={{ textAlign: 'center' }}>
            <div className="etiquette">Rejoindre la partie</div>
            <div className="qr">{url && <QRCodeSVG value={url} size={220} level="M" />}</div>
            <div className="code-geant">{code}</div>
            <div style={{ color: 'var(--doux)', fontSize: '.9rem' }}>Scanne le QR code ou va sur <strong style={{ color: 'var(--texte)' }}>{url.replace(/^https?:\/\//, '').split('?')[0]}</strong> et saisis le code.</div>
          </div>
          <div className="panneau">
            <h2 style={{ fontSize: '1.4rem' }}>Au village : {joueurs.length} / {max}</h2>
            <div className="joueurs-salle">
              {joueurs.map((j) => (
                <div key={j.id} className="joueur-puce"><span className="avatar">{j.pseudo.slice(0, 1).toUpperCase()}</span>{j.pseudo}</div>
              ))}
              {joueurs.length === 0 && <span style={{ color: 'var(--doux)' }}>En attente des premiers habitants…</span>}
            </div>
            {erreur && <div className="erreur">{erreur}</div>}
            <button className="btn btn-or btn-bloc btn-grand" style={{ marginTop: '1.2rem' }} disabled={occupe || joueurs.length < min} onClick={lancer}>
              {joueurs.length < min ? `Encore ${min - joueurs.length} joueur(s) minimum` : 'Lancer la partie'}
            </button>
            <label className="interrupteur" style={{ marginTop: '.8rem' }}>
              <span>🔊 Narration vocale</span>
              <input type="checkbox" checked={voix} onChange={(e) => setVoix(e.target.checked)} style={{ width: 24, height: 24 }} />
            </label>
          </div>
        </div>
      </main>
    </>
  );
}
