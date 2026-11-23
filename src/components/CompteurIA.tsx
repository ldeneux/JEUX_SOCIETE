'use client';

/** Compteur de joueurs IA (− / +). */
export function CompteurIA({ valeur, max, onChange, disabled }: { valeur: number; max: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="stepper">
      <button type="button" className="btn" aria-label="Moins d’IA" disabled={disabled || valeur <= 0} onClick={() => onChange(valeur - 1)}>−</button>
      <span className="stepper-valeur">🤖 {valeur}</span>
      <button type="button" className="btn" aria-label="Plus d’IA" disabled={disabled || valeur >= max} onClick={() => onChange(valeur + 1)}>+</button>
    </div>
  );
}
