# 🌕 Ravensburg

Jeux de société à information cachée : **une console au centre** (TV / ordinateur) et **un téléphone par joueur**.
Premier jeu : **Ravensburg** (Loup-garou, 29 rôles, dont le Comte Dracula). Prochain : *Meurtre au manoir*.

Stack : **Next.js 16** (App Router) · **Supabase** (Postgres, Auth, Realtime) · **Vercel**.

## Déploiement en 6 étapes

1. **Pousse ce dossier sur Git** (GitHub/GitLab) et importe le dépôt dans Vercel (framework détecté : Next.js).
2. **Base de données** — dans Supabase > SQL Editor, exécute `supabase/migrations/20260101000000_jeux_ravensburg.sql`.
   Tout est créé dans le **schéma `jeux`** ; les tables communes sont préfixées `plateforme_`, celles du jeu `loupgarou_`.
   Rien n'est touché dans `public`.
3. **Expose le schéma** — Supabase > Settings > API > *Exposed schemas* : ajoute **`jeux`**.
4. **Connexions anonymes** — Supabase > Authentication > Sign In / Providers : active **Allow anonymous sign-ins**
   (c'est ce qui permet aux téléphones de jouer sans compte). Tes comptes existants servent à l'hôte de la console.
5. **Variables d'environnement Vercel** (voir `.env.example`) :
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret, jamais `NEXT_PUBLIC_`), `CRON_SECRET` (facultatif).
6. **Déploie**, ouvre `/console`, connecte-toi (ou « continuer sans compte »), crée un salon, scanne le QR code avec un téléphone.

> Conseil : choisis pour Vercel une région proche de ton projet Supabase (Settings > Functions > Region), pour des actions plus rapides.

## Les minuteurs (important)

Il n'y a pas de serveur permanent. La **console** déclenche `POST /api/salons/[code]/tick` à chaque échéance
(idempotent, protégé par un verrou de version). Si la console est fermée, la partie attend.
Filet de sécurité : appelle `GET /api/cron/tick` chaque minute avec `Authorization: Bearer $CRON_SECRET`
(Supabase `pg_cron` + `pg_net`, cron-job.org, GitHub Actions…). Vercel Cron en offre Hobby est limité à 1 appel/jour, il ne suffit pas.

## Architecture

```
src/lib/jeux/contract.ts        contrat d'un module de jeu (fonctions pures)
src/lib/jeux/moteur.ts          moteur générique : état -> module -> sauvegarde (CAS) -> diffusion
src/lib/jeux/registre.ts        ajouter un jeu = un dossier + une ligne ici
src/lib/jeux/loupgarou/         Ravensburg : rôles, générateur de composition, déroulé, vues, simulateur
src/lib/serveur/                dépôt Supabase, diffusion (table plateforme_vues), helpers d'API
src/app/api/                    routes : salons, rejoindre, démarrer, action, tick, vue, cron
src/app/console/                console de l'hôte (QR code, table ronde, narration vocale)
src/app/jouer/                  téléphone (rejoindre, écran de jeu, carte secrète)
supabase/migrations/            schéma `jeux`
```

**Sécurité** : l'état complet (rôles, secrets) vit dans `jeux.plateforme_etats`, accessible **uniquement** par le serveur
(RLS sans policy). Chaque écran lit sa propre ligne de `jeux.plateforme_vues` (RLS : `user_id = auth.uid()`),
alimentée par `vueJoueur()`, qui ne contient que ce que ce joueur a le droit de savoir. Aucun client n'écrit : tout passe par `/api`.

## Développement

```bash
npm install
cp .env.example .env.local   # renseigne les 3 clés Supabase
npm run dev                  # http://localhost:3000
npm test                     # 22 tests : composition, parties simulées par bots, moteur
npm run seed:roles           # régénère le SQL des rôles depuis roles.ts (source de vérité)
```

Pour ajouter / modifier un rôle : `src/lib/jeux/loupgarou/roles.ts` (poids, score, ordre de nuit), une étape dans
`etapes.ts` ou `etapes-speciales.ts` si le rôle se réveille, et `roles-info.ts` pour les textes. Les tests de simulation
jouent chaque rôle du catalogue.

## Cartes illustrées

21 rôles sur 29 ont leur carte (`public/ravensburg/cartes/<code>.webp`, 640×960). Sans image, une carte « grimoire »
(emoji + nom) est générée. Cartes manquantes : medium, juge, servante, comedien, infect, grand_mechant_loup, dracula, chien_loup.
Dépose simplement `<code>.webp` et ajoute le code dans `CARTES_ILLUSTREES` (`roles-info.ts`).

## Limites connues

- Le chemin Supabase (PostgREST + Realtime) n'a pas pu être exercé de bout en bout depuis l'environnement de génération :
  la migration et la RLS ont été testées sur PostgreSQL 16, le moteur sur un dépôt en mémoire, le front par `next build`.
  Fais une première partie à 3-4 téléphones avant d'inviter tout le monde.
- Le rythme d'une nuit peut laisser deviner qu'un rôle est mort ou absent ; `leurreSecondes` atténue sans supprimer ce biais.
- Les vues sont écrites après le verrou d'état ; en cas de course très rare, le polling (6 s) resynchronise l'écran.

Règles détaillées : `docs/REGLES.md`.
