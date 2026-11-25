import { PERSO_PAR_CODE } from '@/lib/jeux/archives/donnees';

/** Portrait d'un enquêteur (miniature) + son pouvoir. */
export function CartePerso({ code, grande = false }: { code: string; grande?: boolean }) {
  const p = PERSO_PAR_CODE[code];
  return (
    <div className={`carte-perso${grande ? ' grande' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/archives/persos/${code}.webp`} alt={p?.nom ?? code} loading="lazy" />
      <div className="legende"><strong>{p?.nom}</strong><span>{p?.pouvoir}</span></div>
    </div>
  );
}
