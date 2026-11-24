-- Migration 003 : ajoute ELDORIA au catalogue (en construction). Code technique : eldoria (tables futures : eldoria_*).
insert into jeux.plateforme_catalogue (code, nom, description, visuel_url, joueurs_min, joueurs_max, duree_minutes, statut)
values ('eldoria', 'ELDORIA : LES ROYAUMES BRISÉS',
        'Jeu de cartes de conquête, d''exploration et d''objectifs secrets : 12 cristaux, 5 factions, un ennemi commun.',
        '/eldoria/fond.webp', 2, 5, 60, 'en_construction')
on conflict (code) do update set nom = excluded.nom, description = excluded.description, visuel_url = excluded.visuel_url,
  joueurs_min = excluded.joueurs_min, joueurs_max = excluded.joueurs_max, duree_minutes = excluded.duree_minutes;
