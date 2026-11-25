'use client';
import type { LigneCarnet } from '@/lib/jeux/archives/vues';

interface Section { cat: string; titre: string; cartes: LigneCarnet[] }
export interface DonneesCarnet { carnet: Section[]; alternatives: string[]; position: string; pouvoir: string }

const ICONE: Record<LigneCarnet['statut'], string> = { main: '🂠', montree: '👁', innocente: '✖', inconnue: '❓' };
const imageDe = (cat: string, id: string) => (cat === 'suspect' ? `/archives/persos/${id}.webp` : cat === 'artefact' ? `/archives/artefacts/${id}.webp` : null);

/** Carnet d'enquête automatique : seulement des faits connus de ce joueur. À toi de déduire le reste. */
export function CarnetArchives({ donnees }: { donnees: DonneesCarnet }) {
  return (
    <div className="carnet">
      <p className="carnet-aide">🂠 dans ta main · 👁 vue chez un autre · ✖ hors de la solution · ❓ encore possible</p>
      {donnees.alternatives.length > 0 && (
        <div className="carnet-alt"><b>Témoignages :</b> {donnees.alternatives.map((a, i) => <span key={i}>{a}</span>)}</div>
      )}
      {donnees.carnet.map((s) => (
        <section key={s.cat}>
          <h4>{s.titre}</h4>
          <ul>
            {s.cartes.map((k) => (
              <li key={k.id} className={`c-${k.statut}`}>
                {imageDe(s.cat, k.id) && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={imageDe(s.cat, k.id)!} alt="" loading="lazy" />)}
                <span className="nom">{k.nom}</span>
                <span className="etat" title={k.statut}>{ICONE[k.statut]}{k.detail ? ` ${k.detail}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
