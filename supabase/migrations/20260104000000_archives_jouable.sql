-- Migration 004 : « CLUEDO : LES ARCHIVES DU TEMPS » devient jouable.
update jeux.plateforme_catalogue
   set statut = 'jouable',
       description = 'Un artefact a disparu des Archives du Temps. Voyagez de monument en monument, interrogez, déduisez, accusez.',
       joueurs_min = 2, joueurs_max = 6, duree_minutes = 45
 where code = 'archives';
