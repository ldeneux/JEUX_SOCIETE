import { createClient } from '@supabase/supabase-js';

/** Client SERVICE (contourne la RLS) : à n'utiliser que dans les routes API. Jamais côté navigateur. */
export function sbService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ErreurHttp(500, 'Configuration Supabase manquante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient<any, 'jeux'>(url, key, {
    db: { schema: 'jeux' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export type Sb = ReturnType<typeof sbService>;

export class ErreurHttp extends Error {
  constructor(public statut: number, message: string) {
    super(message);
  }
}
