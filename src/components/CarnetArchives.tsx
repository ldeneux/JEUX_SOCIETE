'use client';
import { useEffect, useState } from 'react';
import type { LigneCarnet } from '@/lib/jeux/archives/vues';
import { imgCarte } from '@/lib/jeux/archives/images';

interface Section { cat: string; titre: string; cartes: LigneCarnet[] }
export interface DonneesCarnet { carnet: Section[]; alternatives: string[]; position: string; pouvoir: string }

/** Marque personnelle posée au doigt : 0 = actif, 1 = éliminé, 2 = piste prioritaire. */
type Marque = 0 | 1 | 2;
const BADGE: Record<LigneCarnet['statut'], { icone: string; titre: string } | null> = {
  main: { icone: '🂠', titre: 'Dans ta main' }, montree: { icone: '👁', titre: 'Vue chez un autre joueur' },
  innocente: { icone: '✖', titre: 'Hors de la solution' }, inconnue: null,
};

/**
 * Carnet d'enquête visuel : les faits CERTAINS (main, cartes montrées, indices) sont posés automatiquement ;
 * en plus, un appui sur une vignette bascule ta marque personnelle : actif → éliminé → piste prioritaire.
 */
export function CarnetArchives({ donnees, code }: { donnees: DonneesCarnet; code?: string }) {
  const cle = code ? `arch-carnet-${code}` : null;
  const [marques, setMarques] = useState<Record<string, Marque>>({});

  useEffect(() => {
    if (!cle) return;
    try { setMarques(JSON.parse(localStorage.getItem(cle) ?? '{}')); } catch { /* stockage indisponible */ }
  }, [cle]);

  const basculer = (k: string) => setMarques((m) => {
    const suiv = { ...m, [k]: (((m[k] ?? 0) + 1) % 3) as Marque };
    if (cle) try { localStorage.setItem(cle, JSON.stringify(suiv)); } catch { /* ignoré */ }
    return suiv;
  });

  const elimines = Object.values(marques).filter((m) => m === 1).length;
  const pistes = Object.values(marques).filter((m) => m === 2).length;

  return (
    <div className="carnet">
      <p className="carnet-aide">
        Appuie sur une vignette : <b>actif</b> → <span className="barre">éliminé</span> → <b className="or">piste prioritaire</b>.
        &nbsp;🂠 main · 👁 vue · ✖ hors solution (automatique)
      </p>
      <div className="carnet-resume">{elimines} éliminée{elimines > 1 ? 's' : ''} · {pistes} piste{pistes > 1 ? 's' : ''}</div>
      {donnees.alternatives.length > 0 && (
        <div className="carnet-alt"><b>Témoignages :</b> {donnees.alternatives.map((a, i) => <span key={i}>{a}</span>)}</div>
      )}
      {donnees.carnet.map((s) => (
        <section key={s.cat} className="carnet-section">
          <h4>{s.titre} <small>({s.cartes.length})</small></h4>
          <ul className={`carnet-grille g-${s.cat}`}>
            {s.cartes.map((k) => {
              const cleK = `${s.cat}:${k.id}`;
              const m = marques[cleK] ?? 0;
              const b = BADGE[k.statut];
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    className={`vignette c-${k.statut}${m === 1 ? ' m-elimine' : ''}${m === 2 ? ' m-piste' : ''}`}
                    title={`${k.nom}${k.detail ? ` — ${k.detail}` : ''}`}
                    aria-label={`${k.nom}${b ? ` : ${b.titre}` : ''}`}
                    aria-pressed={m !== 0}
                    onClick={() => basculer(cleK)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgCarte(s.cat, k.id)} alt="" loading="lazy" />
                    {b && <span className="v-badge" title={b.titre}>{b.icone}{k.detail ? <i>{k.detail}</i> : null}</span>}
                    {m === 2 && <span className="v-piste">★</span>}
                    <span className="v-nom">{k.nom}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
