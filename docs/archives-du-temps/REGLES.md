# CLUEDO : LES ARCHIVES DU TEMPS — règles de la version jouable

Un artefact a disparu des Archives du Temps. Une solution cachée est tirée au hasard : **un suspect, un artefact, un lieu, un mobile**.
Les 27 autres cartes sont distribuées. Le premier qui accuse juste gagne.

## Les cartes (31)
- **6 suspects** (= les 6 personnages jouables) · **10 artefacts** (tes reliques) · **9 lieux** · **6 mobiles** (ceux du GDD).
- La partie dure en moyenne ~10 manches ; avec des IA seules, 100 % des enquêtes simulées sont résolues.

## Le plateau : ta carte du monde
- 15 monuments reliés par les chemins de pièces. **9 sont des lieux d'enquête** (Tour Eiffel, Colisée, Pyramides, Chichén Itzá, Grande Muraille, Taj Mahal, Petra, Machu Picchu, Atlantide), **6 abritent un PNJ** (Big Ben, Statue de la Liberté, Moaï, Torii, Opéra de Sydney, Palais d'Orient).
- Tout le monde part de la Tour Eiffel (le hub lumineux de la carte).

## Un tour
1. **Pouvoir spécial** (si disponible).
2. **Déplacement** : jusqu'à 3 pas le long des chemins (sites fermés exclus).
3. **PNJ** : arriver chez un PNJ donne un **témoignage** (une fois par enquêteur et par PNJ) : « cette carte n'a rien à voir » ou « le coupable est A ou B ». Les témoignages sont toujours vrais.
4. **Hypothèse** (sur un lieu d'enquête) : tu proposes suspect + artefact + mobile ; le lieu est celui où tu te trouves. Dans l'ordre de la table, le premier joueur qui détient au moins une de ces 4 cartes doit en **montrer une, en secret, à toi seul**. Si personne ne peut réfuter, tout le monde le sait.
5. **Fin de tour** : terminer, ou **accuser** (une seule chance : une accusation fausse écarte le joueur, qui continue de réfuter avec ses cartes).

## Les personnages
| Personnage | Pouvoir |
|---|---|
| L'Explorateur | 4 pas au lieu de 3 |
| L'Historienne | chaque témoignage de PNJ donne 2 indices |
| Le Cartographe | une fois : raccourci temporel vers n'importe quel site |
| L'Agent Temporel | une fois : détecte une carte innocente dans la catégorie de son choix |
| L'Archéologue | ses 3 premières visites de lieux révèlent un artefact innocenté |
| Le Conservateur | commence avec un artefact innocenté |

## Les modes
- **Enquête classique** : premier à trouver la solution.
- **Course contre le temps** : 12 manches maximum, sinon les Archives se referment et personne ne gagne.
- **Archives vivantes** : à chaque manche, un événement possible — un site se ferme (faille temporelle) ou un témoin innocente publiquement une carte.

## Joueurs IA
Jusqu'à 6 joueurs au total. Les IA raisonnent comme un joueur : leurs cartes, ce qu'on leur montre, leurs indices, et l'historique public (qui a fait quelle hypothèse, qui a pu réfuter). Une hypothèse que personne ne peut réfuter leur livre la solution.

## Pas encore dans cette version (GDD)
Modes Coopération et Traître caché, 50+ artefacts, ailes par civilisation (la carte du monde les remplace), quêtes secondaires des PNJ, chat intégré.
Les 5 reliques non utilisées (flamme, calendrier, masque maya, moaï, cœur) et 9 portraits sont prêts dans `public/archives/` pour la suite.
