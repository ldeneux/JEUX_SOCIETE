import { sb } from './supabase';

export async function appeler<T = any>(chemin: string, init: { method?: string; corps?: unknown } = {}): Promise<T> {
  const { data } = await sb().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(chemin, {
    method: init.method ?? (init.corps !== undefined ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.corps !== undefined ? JSON.stringify(init.corps) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.erreur ?? `Erreur ${res.status}`);
  return json as T;
}

/** Retourne la session existante, ou crée une session anonyme si `anonyme` (téléphones). */
export async function session(anonyme = false) {
  const { data } = await sb().auth.getSession();
  if (data.session) return data.session;
  if (!anonyme) return null;
  const r = await sb().auth.signInAnonymously();
  if (r.error) throw new Error('Connexion impossible. Les connexions anonymes sont-elles activées dans Supabase ?');
  return r.data.session;
}
