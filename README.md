# 🌕 Jeux à secrets

Plateforme de jeux de société à information cachée : **une console au centre** (TV / ordinateur) et **un téléphone par joueur**.

| Jeu | État |
|---|---|
| **LOUPS-GAROUS : ÉDITION RAVENSBURG** — 29 rôles dont le Comte Dracula, 5 modes, joueurs IA | ✅ jouable |
| **CLUEDO : LES ARCHIVES DU TEMPS** — enquête et déduction sur la carte du monde, 2–6 joueurs, 3 modes, joueurs IA | ✅ jouable (règles : `docs/archives-du-temps/REGLES.md`) |
| **ELDORIA : LES ROYAUMES BRISÉS** — jeu de cartes de conquête et d'objectifs secrets, 2–5 joueurs | 🚧 en construction (fiche projet dans `docs/eldoria/`) |

Stack : **Next.js 16** (App Router) · **Supabase** (Postgres, Auth, Realtime) · **Vercel**.
Le nom de la plateforme se change en un seul endroit : `src/lib/marque.ts`.

## Déploiement en 6 étapes

1. **Pousse ce dossier sur Git** et importe le dépôt dans Vercel (Next.js détecté).
2. **Base de données** — Supabase > SQL Editor, exécute **dans l'ordre** :
   `20260101…jeux_ravensburg.sql`, `20260102…ia_et_renommage.sql`, `20260103…catalogue_eldoria.sql`, `20260104…archives_jouable.sql`
   (dossier `supabase/migrations/` ; saute celles que tu as déjà exécutées).
   Tout vit dans le **schéma `jeux`** ; tables communes préfixées `plateforme_`, tables d'un jeu préfixées par son code (`loupgarou_`, plus tard `archives_`). Rien n'est touché dans `public`.
3. **Expose le schéma** — Settings > API > *Exposed schemas* : ajoute **`jeux`**.
4. **Connexions anonymes** — Authentication > Sign In / Providers : active **Allow anonymous sign-ins** (les téléphones jouent sans compte ; tes comptes existants servent à l'hôte).
5. **Variables Vercel** (voir `.env.example`) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret, jamais `NEXT_PUBLIC_`), `CRON_SECRET` (facultatif).
6. **Déploie**, ouvre `/console`, crée un salon.

> Pas besoin d'amis pour tester : dans la salle d'attente, **« Compléter avec des joueurs IA »** suffit pour lancer une partie seul (ou même 100 % IA, en spectateur).

## Joueurs IA

- Choisis le nombre d'IA à la création du salon ou dans la salle d'attente (− / +), sans limite autre que le maximum du jeu (30 pour Loups-garous). Tu peux dépasser le minimum pour corser la partie.
- **Les humains sont prioritaires** : ils sont servis en premier dans la distribution des rôles, et si la table est trop petite ce sont les IA en trop qui sont retirées.
- Prénoms aléatoires, uniques, jamais ceux des humains (accents et casse ignorés). Les IA sont discernables seulement à la fin de partie (🤖).
- Elles **ne trichent pas** : elles n'utilisent que leur rôle, leurs alliés connus et ce que leur Voyante a appris. Loups ne votent pas leurs frères, serviteurs de Dracula protègent le Comte, amoureux s'épargnent, etc.
- Techniquement : lignes `plateforme_joueurs` avec `est_ia = true` et sans compte ; `jouerIA()` (dans `moteur.ts`) joue pour elles après chaque démarrage, action ou tick, en une seule écriture par phase.

## Les minuteurs (important)

Pas de serveur permanent. La **console** déclenche `POST /api/salons/[code]/tick` à chaque échéance (idempotent, verrou de version). Console fermée = la partie attend.
Filet de sécurité : `GET /api/cron/tick` chaque minute avec `Authorization: Bearer $CRON_SECRET` (Supabase `pg_cron` + `pg_net`, cron-job.org, GitHub Actions…). Vercel Cron en offre Hobby est limité à 1 appel/jour : insuffisant seul.

## Architecture

```
src/lib/jeux/contract.ts        contrat d'un module de jeu (fonctions pures, IA optionnelle)
src/lib/jeux/moteur.ts          moteur générique : état -> module -> sauvegarde (CAS) -> diffusion ; jouerIA
src/lib/jeux/registre.ts        ajouter un jeu = un dossier + une ligne ici
src/lib/jeux/loupgarou/         Loups-garous : rôles, générateur de composition, déroulé, vues, IA, simulateur
src/lib/jeux/archives/          CLUEDO : plateau, cartes, règles, IA d'enquêteur, vues (console + carnet d'enquête)
src/lib/serveur/                dépôt Supabase, diffusion (table plateforme_vues), helpers d'API
src/app/api/                    salons, rejoindre, démarrer, action, tick, vue, cron
src/app/console/  src/app/jouer/  src/app/roles/   console, téléphone, grimoire des 29 rôles
supabase/migrations/            schéma `jeux`
```

**Sécurité** : l'état complet (rôles, secrets) vit dans `jeux.plateforme_etats`, lisible **uniquement** par le serveur (RLS sans policy). Chaque écran lit sa propre ligne de `jeux.plateforme_vues` (RLS `user_id = auth.uid()`), alimentée par `vueJoueur()` qui ne contient que ce que ce joueur peut savoir. Aucun client n'écrit : tout passe par `/api`.

## Développement

```bash
npm install
cp .env.example .env.local     # 3 clés Supabase
npm run dev                    # http://localhost:3000
npm test                       # 37 tests : composition, parties simulées (2 jeux), moteur, IA, rendu des écrans
npm run seed:roles             # régénère le SQL des rôles depuis roles.ts (source de vérité)
```

Ajouter / modifier un rôle : `src/lib/jeux/loupgarou/roles.ts` (poids, score, ordre de nuit), une étape dans `etapes.ts` / `etapes-speciales.ts` s'il se réveille, `roles-info.ts` pour les textes. Les simulations jouent chaque rôle.

## Cartes illustrées

**29 rôles sur 29** ont leur carte (`public/ravensburg/cartes/<code>.webp`, 640×960). Un rôle sans image reçoit une carte « grimoire » générée.
Remplacer une carte = déposer `<code>.webp` au même nom. La carte « Loups-garous » (menhir à la patte lumineuse) est celle du Loup-garou ; l'ancienne carte très agressive illustre désormais le **Grand Méchant Loup**.

## Limites connues

- Le chemin Supabase (PostgREST + Realtime) n'a pas pu être exercé de bout en bout depuis l'environnement de génération : migrations et RLS testées sur PostgreSQL 16, moteur sur un dépôt en mémoire, front par `next build` + `next start`. Fais une première partie avant d'inviter tout le monde.
- Le rythme d'une nuit peut laisser deviner qu'un rôle est mort ou absent ; `leurreSecondes` atténue sans supprimer ce biais.
- Les IA jouent « raisonnablement » mais pas finement : aux Loups-garous elles ne débattent pas (le débat reste humain) ; aux Archives elles déduisent honnêtement mais sans bluff.
- Les vues sont écrites après le verrou d'état ; en cas de course très rare, le polling (6 s) resynchronise l'écran.

Règles détaillées : `docs/REGLES.md`.
