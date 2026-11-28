'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import type { VueConsole } from '@/lib/jeux/contract';
import { appeler, session } from '@/lib/client/api';
import { useCompteARebours, useSalon, useVue } from '@/lib/client/hooks';
import { PlateauConsole } from '@/components/PlateauConsole';
import { CompteurIA } from '@/components/CompteurIA';
import { PlateauArchives } from '@/components/PlateauArchives';

export default function ConsolePartie() {
  const { code: brut } = useParams<{ code: string }>();
  const code = String(brut).toUpperCase();
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [voix, setVoix] = useState(true);
  const [jeux, setJeux] = useState<{ code: string; nom: string; joueurs: { min: number; max: number }; modes: { code: string; nom: string }[] }[]>([]);
  const [iaLocal, setIaLocal] = useState<number | null>(null);

  useEffect(() => {
    session(false).then((s) => (s ? setPret(true) : router.replace('/console')));
  }, [router]);
  useEffect(() => {
    fetch('/api/jeux').then((r) => r.json()).then((d) => setJeux(d.jeux));
  }, []);

  const { salon, joueurs, erreur: erreurSalon } = useSalon(code);
  const diff = useVue<VueConsole>(code, 'console');
  const secondes = useCompteARebours(diff.echeance);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/jouer?code=${code}${salon?.jeu_code ? `&jeu=${salon.jeu_code}` : ''}` : '';

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
          {salon?.jeu_code === 'archives' ? <PlateauArchives vue={diff.vue} secondes={secondes} /> : <PlateauConsole vue={diff.vue} secondes={secondes} />}
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
  const manifeste = jeux.find((j) => j.code === salon?.jeu_code) ?? null;
  const min = manifeste?.joueurs.min ?? 6;
  const max = manifeste?.joueurs.max ?? 30;
  const humains = joueurs.filter((j) => !j.est_ia).length;
  const iaVoulus = iaLocal ?? Number(salon?.options?.ia ?? 0);
  const ia = Math.min(iaVoulus, Math.max(0, max - humains)); // les humains sont prioritaires
  const total = humains + ia;
  const enquete = salon?.jeu_code === 'archives';
  const modeNom = manifeste?.modes.find((m) => m.code === salon?.mode)?.nom ?? salon?.mode;

  async function changerIA(n: number) {
    setIaLocal(n);
    try {
      await appeler(`/api/salons/${code}`, { method: 'PATCH', corps: { options: { ...(salon?.options ?? {}), ia: n } } });
    } catch (e) { setErreur((e as Error).message); }
  }

  return (
    <>
      <div className="fond" />
      <main className="conteneur salon">
        <div className="entete-partie">
          <span className="marque">{manifeste?.nom ?? 'Salon'}</span>
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
            <h2 style={{ fontSize: '1.4rem' }}>{enquete ? 'Aux Archives' : 'Au village'} : {humains} {enquete ? 'enquêteur' : 'humain'}{humains > 1 ? 's' : ''}{ia > 0 ? ` + ${ia} IA` : ''}</h2>
            <div className="joueurs-salle">
              {joueurs.filter((j) => !j.est_ia).map((j) => (
                <div key={j.id} className="joueur-puce"><span className="avatar">{j.pseudo.slice(0, 1).toUpperCase()}</span>{j.pseudo}</div>
              ))}
              {ia > 0 && <div className="joueur-puce"><span className="avatar">🤖</span>{ia} {enquete ? 'enquêteur' : 'joueur'}{ia > 1 ? 's' : ''} IA</div>}
              {humains === 0 && ia === 0 && <span style={{ color: 'var(--doux)' }}>{enquete ? 'En attente des premiers enquêteurs…' : 'En attente des premiers habitants…'}</span>}
            </div>

            <div className="ligne-ia">
              <div><strong>{enquete ? 'Enquêteurs IA' : 'Joueurs IA'}</strong><small>{enquete ? 'Complètent la table. Prénoms aléatoires, jamais ceux des enquêteurs humains.' : 'Complètent la table. Prénoms aléatoires, jamais ceux des humains.'} {humains === 0 && ia > 0 ? 'Mode spectateur : la console joue seule.' : ''}</small></div>
              <CompteurIA valeur={iaVoulus} max={max} onChange={changerIA} />
            </div>
            <p className="total-table">{total} {enquete ? 'enquêteur' : 'joueur'}{total > 1 ? 's' : ''} · il en faut de {min} à {max}</p>
            {ia < iaVoulus && <small style={{ color: 'var(--doux)' }}>Les humains sont prioritaires : {iaVoulus - ia} IA en trop seront retirées.</small>}

            {erreur && <div className="erreur">{erreur}</div>}
            {total < min && (
              <button className="btn btn-bloc" style={{ marginTop: '.8rem' }} onClick={() => changerIA(Math.max(0, min - humains))}>
                🤖 Compléter avec {Math.max(0, min - humains)} {enquete ? 'enquêteur(s)' : 'joueur(s)'} IA
              </button>
            )}
            <button className="btn btn-or btn-bloc btn-grand" style={{ marginTop: '.8rem' }} disabled={occupe || total < min} onClick={lancer}>
              {total < min ? `Encore ${min - total} joueur(s) minimum` : 'Lancer la partie'}
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
