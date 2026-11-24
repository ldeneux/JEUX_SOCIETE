# Eldoria : Les Royaumes Brisés — notes d'intégration

Source : `fiche-projet-gameplay-v1.pdf` (règles complètes, 100 cartes de faction, 32 Lieux, 12 cristaux, 20 objectifs, 9 Fléaux).
Fond d'écran : `public/eldoria/fond.webp` (carte des 6 royaumes). Code technique : `eldoria` ; tables du jeu préfixées `eldoria_`.

## Ce qui se branche tel quel sur la plateforme
- **Moteur pur** : la fiche demande déjà `applyAction(state, action, rng) → {state, events}` sans dépendance Supabase. C'est le contrat `JeuModule` (`valider` / `appliquer` / `avancer`), et le simulateur de bots de `loupgarou/simulation.ts` est réutilisable pour l'équilibrage (§15).
- **Information cachée** : `game_secret` + `game_private` + `game_public` de la fiche = `plateforme_etats` (secret, serveur seul) + `plateforme_vues` (une ligne par joueur, RLS). Pas de table supplémentaire pour l'état de partie.
- **Verrou de version, journal, Realtime, minuteurs** : déjà fournis (`version`, `plateforme_journal`, `plateforme_vues`, `tick`). La fenêtre de Réaction (20 s) devient une `Attente` avec échéance.
- **IA** : le hook `ia()` du contrat permet des joueurs IA (utile aussi pour tester seul).
- **Contenu statique** : tables `eldoria_cards`, `eldoria_locations`, `eldoria_crystals`, `eldoria_objectives`, `eldoria_fleau_cards`, `eldoria_config` (seed généré depuis le code, comme `npm run seed:roles`), effets en JSON selon la taxonomie du §13.

## Ce qui demandera un travail propre
1. **Mode « chacun son écran »** : Eldoria se joue en ligne, sans console partagée. La console doit devenir facultative (un `tick` peut être déclenché par n'importe quel joueur connecté, c'est déjà autorisé par la route).
2. **Vue publique partagée** : la table (rivière de Lieux, provinces, cristaux, prestige) est la même pour tous. Prévoir une ligne `plateforme_vues` « publique » lisible par tous les membres du salon, plutôt que de la dupliquer dans chaque vue de joueur.
3. **Fenêtres de Réaction en pile** : la pile (dernière carte jouée résolue en premier) est le gros morceau du moteur ; à concevoir avant le reste.
4. **Écrans** : le §16 (9 écrans) ; la carte jointe sert de plateau.

## Points relevés en relisant fiche et carte (à trancher au moment venu)
- Plusieurs noms de lieux diffèrent entre la carte et la fiche : « Pic du Dragon Rouge » / « Col du Dragon Rouge », « Hall des Ancêtres » / « Tombeaux des Ancêtres », « Marais des Ombres » / « Marais Noirs », « Bibliothèque Interdite » / « Bibliothèque Brisée », « Port-Couronne » / « Port de Lunemer ».
- La carte montre **6 royaumes dont Solaria**, alors que la V1 n'en joue que 5 : Solaria sera décorative jusqu'à la V2.
- À 3 joueurs, la table du §3 donne 21 cycles = 63 tours, alors que le texte annonce 60 tours.
