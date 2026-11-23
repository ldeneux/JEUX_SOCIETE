'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appeler } from './api';
import { sb } from './supabase';

export interface Diffusion<V> { vue: V | null; version: number; echeance: string | null; statut?: string }

/**
 * Vue temps réel : lecture initiale + abonnement Realtime (RLS : chacun ne reçoit que sa ligne)
 * + polling de secours + rafraîchissement au retour sur l'onglet (téléphones qui se mettent en veille).
 */
export function useVue<V>(code: string, cible: 'console' | 'joueur') {
  const [d, setD] = useState<Diffusion<V> & { chargee: boolean }>({ vue: null, version: 0, echeance: null, chargee: false });
  const versionRef = useRef(-1);

  const appliquer = useCallback((p: Diffusion<V>) => {
    if (p.version < versionRef.current) return; // ignore une vue périmée
    versionRef.current = p.version;
    setD((prev) => ({ ...prev, ...p, chargee: true }));
  }, []);

  const rafraichir = useCallback(async () => {
    try {
      appliquer(await appeler(`/api/salons/${code}/vue${cible === 'console' ? '?cible=console' : ''}`));
    } catch { /* hors ligne : le polling réessaiera */ }
  }, [code, cible, appliquer]);

  useEffect(() => {
    let actif = true;
    let canal: ReturnType<ReturnType<typeof sb>['channel']> | null = null;
    rafraichir();
    (async () => {
      const { data } = await sb().from('plateforme_salons').select('id').eq('code', code).maybeSingle();
      if (!actif || !data) return;
      canal = sb()
        .channel(`vues:${data.id}:${cible}`)
        .on('postgres_changes', { event: '*', schema: 'jeux', table: 'plateforme_vues', filter: `salon_id=eq.${data.id}` }, (p: any) => {
          const row = p.new;
          if (!row || (row.cible === 'console') !== (cible === 'console')) return;
          appliquer({ vue: row.vue, version: row.version, echeance: row.echeance });
        })
        .subscribe();
    })();
    const poll = setInterval(rafraichir, 6000);
    const visible = () => document.visibilityState === 'visible' && rafraichir();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', rafraichir);
    return () => {
      actif = false;
      clearInterval(poll);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', rafraichir);
      if (canal) sb().removeChannel(canal);
    };
  }, [code, cible, rafraichir, appliquer]);

  return { ...d, rafraichir };
}

export interface JoueurSalon { id: string; pseudo: string; place: number; est_ia?: boolean }
export interface InfosSalon { id: string; statut: string; jeu_code: string; mode: string; options: Record<string, any>; hote_id: string }

/** Salon + liste des joueurs en temps réel (salle d'attente et correspondance id -> pseudo). */
export function useSalon(code: string) {
  const [salon, setSalon] = useState<InfosSalon | null>(null);
  const [joueurs, setJoueurs] = useState<JoueurSalon[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    let canal: ReturnType<ReturnType<typeof sb>['channel']> | null = null;
    const charger = async () => {
      const { data: s } = await sb().from('plateforme_salons').select('*').eq('code', code).maybeSingle();
      if (!actif) return;
      if (!s) return setErreur('Salon introuvable ou accès refusé');
      setSalon(s as InfosSalon);
      const { data: j } = await sb().from('plateforme_joueurs').select('id,pseudo,place,est_ia').eq('salon_id', s.id).order('place');
      if (actif) setJoueurs((j ?? []) as JoueurSalon[]);
      canal = sb()
        .channel(`salon:${s.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'jeux', table: 'plateforme_joueurs', filter: `salon_id=eq.${s.id}` }, (p: any) =>
          setJoueurs((l) => (l.some((x) => x.id === p.new.id) ? l : [...l, p.new].sort((a, b) => a.place - b.place))))
        .on('postgres_changes', { event: 'UPDATE', schema: 'jeux', table: 'plateforme_salons', filter: `id=eq.${s.id}` }, (p: any) =>
          setSalon((prev) => (prev ? { ...prev, ...p.new } : prev)))
        .subscribe();
    };
    charger();
    const poll = setInterval(async () => { // secours si Realtime est coupé
      const { data: s } = await sb().from('plateforme_salons').select('*').eq('code', code).maybeSingle();
      if (s && actif) {
        setSalon(s as InfosSalon);
        const { data: j } = await sb().from('plateforme_joueurs').select('id,pseudo,place,est_ia').eq('salon_id', s.id).order('place');
        if (actif) setJoueurs((j ?? []) as JoueurSalon[]);
      }
    }, 8000);
    return () => { actif = false; clearInterval(poll); if (canal) sb().removeChannel(canal); };
  }, [code]);

  return { salon, joueurs, erreur };
}

/** Secondes restantes avant `echeance` (null si pas de minuteur). */
export function useCompteARebours(echeance: string | null | undefined) {
  const [s, setS] = useState<number | null>(null);
  useEffect(() => {
    if (!echeance) return setS(null);
    const calc = () => setS(Math.max(0, Math.ceil((Date.parse(echeance) - Date.now()) / 1000)));
    calc();
    const i = setInterval(calc, 500);
    return () => clearInterval(i);
  }, [echeance]);
  return s;
}
