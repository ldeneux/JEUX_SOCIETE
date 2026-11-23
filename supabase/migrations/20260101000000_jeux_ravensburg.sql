-- =====================================================================
-- Ravensburg : schéma "jeux" (plateforme de jeux de société console + téléphones)
-- Base PARTAGÉE : tout vit dans le schéma `jeux`. Tables communes préfixées plateforme_,
-- tables d'un jeu préfixées par son code (loupgarou_, manoir_...).
-- Comptes : on s'appuie sur auth.users (comptes existants + connexions anonymes des téléphones).
--
-- APRÈS EXÉCUTION (obligatoire) :
--   1. Dashboard > Settings > API > "Exposed schemas" : ajouter  jeux
--   2. Dashboard > Authentication > Sign In / Providers : activer "Allow anonymous sign-ins"
-- =====================================================================

create schema if not exists jeux;

grant usage on schema jeux to authenticated, service_role;
alter default privileges in schema jeux grant all on tables to service_role;
alter default privileges in schema jeux grant all on sequences to service_role;
alter default privileges in schema jeux grant all on functions to service_role;

-- ---------------------------------------------------------------------
-- PLATEFORME
-- ---------------------------------------------------------------------

create table jeux.plateforme_catalogue (
  code          text primary key,
  nom           text not null,
  description   text,
  visuel_url    text,
  joueurs_min   smallint not null,
  joueurs_max   smallint not null,
  duree_minutes smallint,
  statut        text not null default 'jouable' check (statut in ('jouable','en_construction'))
);

create table jeux.plateforme_salons (
  id        uuid primary key default gen_random_uuid(),
  code      text not null unique default upper(substr(md5(random()::text), 1, 5)),
  jeu_code  text not null references jeux.plateforme_catalogue(code),
  hote_id   uuid not null references auth.users(id) on delete cascade,
  mode      text not null default 'equilibre',
  options   jsonb not null default '{}',
  statut    text not null default 'attente' check (statut in ('attente','en_cours','terminee','abandonnee')),
  cree_le   timestamptz not null default now()
);
create index on jeux.plateforme_salons (hote_id);

create table jeux.plateforme_joueurs (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references jeux.plateforme_salons(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  pseudo     text not null,
  place      smallint not null,
  rejoint_le timestamptz not null default now(),
  unique (salon_id, user_id)
);
create unique index plateforme_joueurs_pseudo on jeux.plateforme_joueurs (salon_id, lower(pseudo));
create index on jeux.plateforme_joueurs (user_id);

-- État complet d'une partie, secrets inclus. SERVEUR UNIQUEMENT (RLS sans policy).
create table jeux.plateforme_etats (
  salon_id  uuid primary key references jeux.plateforme_salons(id) on delete cascade,
  jeu_code  text not null references jeux.plateforme_catalogue(code),
  mode      text not null,
  config    jsonb not null default '{}',
  etat      jsonb,
  version   integer not null default 0,     -- verrou optimiste (compare-and-swap)
  echeance  timestamptz,                    -- fin de la phase courante
  maj_le    timestamptz not null default now()
);
create index on jeux.plateforme_etats (echeance) where echeance is not null;

-- Journal append-only (replays, statistiques). SERVEUR UNIQUEMENT.
create table jeux.plateforme_journal (
  id            bigint generated always as identity primary key,
  salon_id      uuid not null references jeux.plateforme_salons(id) on delete cascade,
  version       integer not null,
  type          text not null,
  visibilite    text not null check (visibilite in ('public','prive')),
  destinataires uuid[] not null default '{}',
  donnees       jsonb not null default '{}',
  cree_le       timestamptz not null default now()
);
create index on jeux.plateforme_journal (salon_id, id);

-- Dernière vue calculée pour chaque écran. Chaque téléphone ne lit QUE sa ligne (RLS),
-- la console ne lit que la sienne. Les clients s'abonnent à cette table via Realtime.
create table jeux.plateforme_vues (
  salon_id  uuid not null references jeux.plateforme_salons(id) on delete cascade,
  cible     text not null,                  -- 'console' ou l'id du joueur
  user_id   uuid not null references auth.users(id) on delete cascade,
  version   integer not null,
  echeance  timestamptz,
  vue       jsonb not null,
  maj_le    timestamptz not null default now(),
  primary key (salon_id, cible)
);
create index on jeux.plateforme_vues (user_id);

-- ---------------------------------------------------------------------
-- LOUP-GAROU / RAVENSBURG (code technique : loupgarou)
-- ---------------------------------------------------------------------

create table jeux.loupgarou_roles (
  code          text primary key,
  nom           text not null,
  camp          text not null check (camp in ('village','loups','solo')),
  famille       text not null,
  palier        text not null check (palier in ('obligatoire','courant','rare','chaos')),
  presence      numeric(3,2),
  poids         smallint not null default 10,
  score         smallint not null default 0,
  min_joueurs   smallint not null default 5,
  ordre_nuit    smallint,
  nuit1_only    boolean not null default false,
  tags          text[] not null default '{}',
  incompatibles text[] not null default '{}'
);

-- Effet "nouveautés" : parties écoulées depuis la dernière apparition de chaque rôle, par compte hôte.
create table jeux.loupgarou_fraicheur (
  user_id        uuid not null references auth.users(id) on delete cascade,
  role_code      text not null references jeux.loupgarou_roles(code),
  parties_depuis smallint not null default 0,
  primary key (user_id, role_code)
);

-- ---------------------------------------------------------------------
-- SÉCURITÉ
-- ---------------------------------------------------------------------

create function jeux.est_membre(p_salon uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from jeux.plateforme_joueurs where salon_id = p_salon and user_id = auth.uid())
      or exists (select 1 from jeux.plateforme_salons  where id = p_salon and hote_id = auth.uid());
$$;
grant execute on function jeux.est_membre(uuid) to authenticated;

alter table jeux.plateforme_catalogue enable row level security;
alter table jeux.plateforme_salons    enable row level security;
alter table jeux.plateforme_joueurs   enable row level security;
alter table jeux.plateforme_etats     enable row level security;   -- aucune policy : serveur seul
alter table jeux.plateforme_journal   enable row level security;   -- aucune policy : serveur seul
alter table jeux.plateforme_vues      enable row level security;
alter table jeux.loupgarou_roles      enable row level security;
alter table jeux.loupgarou_fraicheur  enable row level security;   -- aucune policy : serveur seul

create policy catalogue_lecture on jeux.plateforme_catalogue for select to authenticated using (true);
create policy roles_lecture     on jeux.loupgarou_roles      for select to authenticated using (true);
create policy salons_lecture    on jeux.plateforme_salons    for select to authenticated using (jeux.est_membre(id));
create policy joueurs_lecture   on jeux.plateforme_joueurs   for select to authenticated using (jeux.est_membre(salon_id));
create policy vues_proprietaire on jeux.plateforme_vues      for select to authenticated using (user_id = auth.uid());

grant select on jeux.plateforme_catalogue, jeux.plateforme_salons, jeux.plateforme_joueurs,
                jeux.plateforme_vues, jeux.loupgarou_roles to authenticated;

-- Realtime : les vues (filtrées par RLS), la liste des joueurs et le statut du salon.
-- Jamais plateforme_etats : il contient les rôles.
alter publication supabase_realtime add table jeux.plateforme_vues, jeux.plateforme_joueurs, jeux.plateforme_salons;

-- Ménage (à planifier avec pg_cron si souhaité) : supprime les salons de plus de 3 jours.
create function jeux.nettoyer_salons() returns integer
language sql security definer set search_path = '' as $$
  with d as (delete from jeux.plateforme_salons where cree_le < now() - interval '3 days' returning 1)
  select count(*)::int from d;
$$;
revoke all on function jeux.nettoyer_salons() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- DONNÉES
-- ---------------------------------------------------------------------

insert into jeux.plateforme_catalogue (code, nom, description, visuel_url, joueurs_min, joueurs_max, duree_minutes, statut) values
('loupgarou', 'Ravensburg', 'Le village dort, les loups rôdent, et une fenêtre s''illumine au sommet du château Corvin.', '/ravensburg/fond.webp', 6, 30, 45, 'jouable'),
('manoir', 'Meurtre au manoir', 'Enquête et déduction dans un manoir : un secret par téléphone, un plan sur la console.', null, 3, 6, 60, 'en_construction')
on conflict (code) do nothing;

insert into jeux.loupgarou_roles
(code, nom, camp, famille, palier, presence, poids, score, min_joueurs, ordre_nuit, nuit1_only, tags, incompatibles) values
('villageois','Villageois','village','socle','obligatoire',null,0,1,4,null,false,'{}','{}'),
('loup_garou','Loup-garou','loups','loup','obligatoire',null,0,-6,4,100,false,'{loup}','{}'),
('voyante','Voyante','village','information','courant',0.9,30,7,6,70,false,'{info}','{}'),
('medium','Médium','village','information','rare',null,10,2,8,150,false,'{info,unique}','{}'),
('petite_fille','Petite Fille','village','information','courant',null,20,3,7,100,false,'{info,passif}','{}'),
('renard','Renard','village','information','rare',null,12,4,8,80,false,'{info,unique}','{}'),
('montreur_ours','Montreur d’ours','village','information','rare',null,12,3,8,null,false,'{info,aube,voisins}','{}'),
('corbeau','Corbeau','village','information','rare',null,12,2,8,160,false,'{vote}','{}'),
('juge','Juge','village','information','rare',null,10,2,9,null,false,'{vote,jour,unique}','{ange}'),
('salvateur','Salvateur','village','protection','courant',null,20,4,8,60,false,'{protection}','{}'),
('ancien','Ancien','village','protection','courant',null,20,3,7,null,false,'{passif}','{}'),
('idiot','Idiot du village','village','protection','courant',null,20,2,7,null,false,'{vote,passif}','{}'),
('bouc_emissaire','Bouc émissaire','village','protection','courant',null,20,1,7,null,false,'{vote,passif}','{}'),
('aubergiste','Aubergiste','village','protection','rare',null,10,3,9,50,false,'{protection,blocage}','{}'),
('servante','Servante dévouée','village','protection','rare',null,10,2,9,null,false,'{mort,unique}','{}'),
('cupidon','Cupidon','village','protection','courant',null,20,2,6,20,true,'{amoureux}','{}'),
('sorciere','Sorcière','village','actif','courant',0.65,25,6,6,120,false,'{potion}','{}'),
('chasseur','Chasseur','village','actif','courant',null,20,3,6,null,false,'{mort}','{}'),
('comedien','Comédien','village','actif','rare',null,8,5,9,90,false,'{pouvoirs}','{voleur}'),
('loup_blanc','Loup blanc','loups','loup','chaos',null,6,-8,8,115,false,'{loup,solo,nuits_paires}','{}'),
('infect','Infect Père des Loups','loups','loup','rare',null,8,-7,8,110,false,'{loup,infection,unique}','{}'),
('grand_mechant_loup','Grand Méchant Loup','loups','loup','rare',null,8,-7,8,101,false,'{loup}','{}'),
('joueur_flute','Joueur de flûte','solo','solo','chaos',null,6,-5,9,140,false,'{solo,enchante}','{}'),
('pyromane','Pyromane','solo','solo','chaos',null,6,-5,9,130,false,'{solo,feu}','{}'),
('voleur','Voleur','village','solo','chaos',null,6,0,6,10,true,'{setup,roles_extra}','{comedien}'),
('enfant_sauvage','Enfant sauvage','village','solo','rare',null,10,1,7,30,true,'{modele}','{chien_loup}'),
('ange','Ange','solo','solo','chaos',null,6,0,8,null,false,'{solo,vote,jour1}','{juge}'),
('dracula','Dracula','solo','solo','chaos',null,6,-5,10,125,false,'{solo,corrupteur,marque}','{}'),
('chien_loup','Chien-loup','village','solo','rare',null,10,0,7,40,true,'{choix_camp}','{enfant_sauvage}')
on conflict (code) do update set nom=excluded.nom, camp=excluded.camp, famille=excluded.famille, palier=excluded.palier,
  presence=excluded.presence, poids=excluded.poids, score=excluded.score, min_joueurs=excluded.min_joueurs,
  ordre_nuit=excluded.ordre_nuit, nuit1_only=excluded.nuit1_only, tags=excluded.tags, incompatibles=excluded.incompatibles;

