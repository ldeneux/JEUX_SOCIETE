-- =====================================================================
-- Migration 002 : joueurs IA + renommage des jeux du catalogue
-- À exécuter APRÈS 20260101000000_jeux_ravensburg.sql. Idempotente pour les données, une seule fois pour le DDL.
-- =====================================================================

-- Joueurs IA : une ligne dans plateforme_joueurs SANS compte (user_id nul).
alter table jeux.plateforme_joueurs alter column user_id drop not null;
alter table jeux.plateforme_joueurs add column if not exists est_ia boolean not null default false;
alter table jeux.plateforme_joueurs
  add constraint plateforme_joueurs_humain_ou_ia check (est_ia or user_id is not null);

-- Renommage des jeux
update jeux.plateforme_catalogue
   set nom = 'LOUPS-GAROUS : ÉDITION RAVENSBURG',
       visuel_url = '/ravensburg/fond.webp'
 where code = 'loupgarou';

-- « Meurtre au manoir » devient « CLUEDO : LES ARCHIVES DU TEMPS » (code technique : archives, préfixe de tables : archives_)
update jeux.plateforme_catalogue
   set code = 'archives',
       nom = 'CLUEDO : LES ARCHIVES DU TEMPS',
       description = 'Un artefact a disparu des Archives du Temps. Enquêtez à travers les civilisations pour démasquer le coupable.',
       visuel_url = '/archives/fond.webp',
       joueurs_min = 2, joueurs_max = 6, duree_minutes = 60
 where code = 'manoir';

insert into jeux.plateforme_catalogue (code, nom, description, visuel_url, joueurs_min, joueurs_max, duree_minutes, statut)
values ('archives', 'CLUEDO : LES ARCHIVES DU TEMPS',
        'Un artefact a disparu des Archives du Temps. Enquêtez à travers les civilisations pour démasquer le coupable.',
        '/archives/fond.webp', 2, 6, 60, 'en_construction')
on conflict (code) do nothing;
