import { CAMPS, CARTES_ILLUSTREES, ROLES_INFO } from '@/lib/jeux/loupgarou/roles-info';
import { parCode } from '@/lib/jeux/loupgarou/roles';

/** Carte illustrée si elle existe, sinon carte "grimoire" générée (emoji + nom). */
export function CarteRole({ code, grande = false }: { code: string; grande?: boolean }) {
  const def = parCode(code);
  const info = ROLES_INFO[code];
  const taille = grande ? ' grande' : '';
  if (CARTES_ILLUSTREES.has(code)) {
    return (
      <div className={`carte-role${taille}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/ravensburg/cartes/${code}.webp`} alt={def.nom} loading="lazy" decoding="async" width={1024} height={1536} />
      </div>
    );
  }
  return (
    <div className={`carte-role sans-image${taille}`} role="img" aria-label={def.nom}>
      <span className="emoji">{info?.emoji ?? '❔'}</span>
      <span className="nom">{def.nom}</span>
      <span className="camp">{CAMPS[def.camp]}</span>
    </div>
  );
}

export function DosCarte({ grande = false }: { grande?: boolean }) {
  return <div className={`carte-role dos${grande ? ' grande' : ''}`} aria-hidden>🌕</div>;
}
