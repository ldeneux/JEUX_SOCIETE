'use client';
import { useState } from 'react';
import type { Descripteur } from '@/lib/jeux/contract';
import { appeler } from '@/lib/client/api';

type Props = { code: string; actions: Descripteur[]; version: number; pseudos: Record<string, string> };

/** Afficheur générique des descripteurs envoyés par le serveur : le même composant sert tous les jeux. */
export function Actions({ code, actions, version, pseudos }: Props) {
  return (
    <div className="liste-action" style={{ gap: '1.4rem' }}>
      {actions.map((a) => (
        <Action key={`${a.id}:${a.type === 'texte' ? 'texte' : version}`} code={code} a={a} pseudos={pseudos} />
      ))}
    </div>
  );
}

function Action({ code, a, pseudos }: { code: string; a: Descripteur; pseudos: Record<string, string> }) {
  const [sel, setSel] = useState<string[]>([]);
  const [etat, setEtat] = useState<'libre' | 'envoi' | 'envoye'>('libre');
  const [erreur, setErreur] = useState('');
  const [texte, setTexte] = useState('');

  async function envoyer(valeur: unknown) {
    setEtat('envoi');
    setErreur('');
    try {
      await appeler(`/api/salons/${code}/action`, { corps: { id: a.id, valeur } });
      if (a.type === 'texte') { setTexte(''); setEtat('libre'); } else setEtat('envoye');
    } catch (e) {
      setErreur((e as Error).message);
      setEtat('libre');
    }
  }

  if (etat === 'envoye') return <div className="message">✓ Choix envoyé. En attente des autres…</div>;
  const occupe = etat === 'envoi';
  const nom = (id: string) => pseudos[id] ?? '…';

  return (
    <div>
      <div className="libelle-action">{a.libelle}</div>

      {a.type === 'joueurs' && (
        <>
          <div className="liste-action">
            {a.candidats.map((id) => (
              <button
                key={id}
                disabled={occupe}
                className={`cible${sel.includes(id) ? ' choisie' : ''}`}
                onClick={() => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : a.max === 1 ? [id] : s.length < a.max ? [...s, id] : s))}
              >
                {nom(id)}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: '.5rem', marginTop: '.8rem' }}>
            <button className="btn btn-or btn-bloc btn-grand" disabled={occupe || sel.length < a.min || sel.length > a.max} onClick={() => envoyer(sel)}>
              {sel.length === 0 && a.min === 0 ? 'Ne rien faire' : 'Valider'}
            </button>
          </div>
        </>
      )}

      {a.type === 'choix' && (
        <div className="liste-action">
          {a.options.map((o) => (
            <button key={o.valeur} disabled={occupe} className="cible" onClick={() => envoyer(o.valeur)}>
              {o.libelle}
            </button>
          ))}
        </div>
      )}

      {a.type === 'confirmer' && (
        <button className="btn btn-or btn-bloc btn-grand" disabled={occupe} onClick={() => envoyer(true)}>
          {a.secondaire ?? 'Confirmer'}
        </button>
      )}

      {a.type === 'texte' && (
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input type="text" value={texte} maxLength={a.maxLongueur} onChange={(e) => setTexte(e.target.value)} placeholder="Chuchote…" />
          <button className="btn btn-or" disabled={occupe || !texte.trim()} onClick={() => envoyer(texte)}>Envoyer</button>
        </div>
      )}

      {erreur && <div className="erreur">{erreur}</div>}
    </div>
  );
}
