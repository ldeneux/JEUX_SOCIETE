import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient<any, 'jeux'> | null = null;

/** Client navigateur (clé anonyme + RLS). Schéma `jeux`. Aucune clé secrète ici. */
export function sb() {
  if (!client) {
    client = createClient<any, 'jeux'>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      db: { schema: 'jeux' },
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
