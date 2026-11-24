# Règles de Ravensburg

## Déroulé
Nuit (réveils par ordre) → matin (annonce des morts) → décisions (Chasseur, Maire, Servante) → [nuit 1 : élection du maire]
→ débat (« prêt à voter » à l'unanimité ou minuteur) → vote → décisions → nuit suivante.

## Résolution d'une nuit (déterministe)
1. **Aubergiste** : l'hôte est intouchable (loups, poison, feu) mais ne peut pas agir.
2. **Salvateur** : protège des loups, du Grand Méchant Loup et du Loup blanc (pas du poison ni du feu).
3. **Sorcière** : elle ne voit que les morts *réels* (après protections). Vie annule une mort due aux loups ; mort ignore la protection.
4. **Ancien** : absorbe la première attaque de loups. **Infect** : une victime protégée n'est pas infectée.
5. **Morts en chaîne** : amoureux → Enfant sauvage (devient loup) → Chasseur (tire) → Maire (désigne un successeur) → Servante.
6. **Victoire** testée après chaque lot de morts. La cause d'une mort n'est jamais annoncée.

## Dracula, Comte de Ravensburg (solitaire, corrupteur)
- Chaque nuit, il pose une **Marque vampirique** secrète. Après N marques (2 par défaut, réglable 1–4), la victime est **corrompue** :
  elle garde identité, rôle et pouvoirs, mais gagne désormais avec Dracula (un loup corrompu quitte la meute, un infecté reperd son camp).
- La victime corrompue apprend l'identité du Comte ; Dracula voit ses marques et ses serviteurs.
- **Victoire** : il a au moins 2 serviteurs vivants et son camp compte la moitié des vivants (ou plus) ; **ou** il reste le dernier pouvoir occulte
  (plus de loups ni de solitaires hostiles) — option `draculaDernierPouvoir`, désactivable.
- Hébergé par l’Aubergiste, Dracula ne peut pas agir cette nuit-là ; un joueur hébergé ne reçoit pas de marque.

## Choix de règles à connaître
- **Renard** : flaire un joueur et ses 2 voisins vivants ; s'il n'y a aucun loup, il perd son flair (règle classique).
- **Servante** : prend le rôle d'un mort du lot, après son annonce (le rôle du mort est révélé avant l'échange). L'état des pouvoirs suit le rôle.
- **Égalité au vote** : le Bouc émissaire meurt ; sinon le Maire tranche ; sinon tirage au sort. Maire = voix double. Corbeau = +2 voix.
- **Ange** : gagne s'il est éliminé au premier vote.
- **Joueur de flûte** : gagne quand tous les autres vivants sont enchantés. **Pyromane** : dernier survivant. **Loup blanc** : seul contre tous.
- **Montreur d'ours** : vibration du téléphone chaque matin si un voisin vivant est loup (infectés compris, corrompus non).

## Joueurs IA
Les IA remplissent la table (humains prioritaires). Elles jouent comme un joueur sans pouvoir particulier : leur rôle, leurs alliés connus
et leurs propres informations (visions de la Voyante) uniquement. Elles confirment immédiatement « prêt à voter » et votent sans débattre.
