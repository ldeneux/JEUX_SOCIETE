# CLUEDO : LES ARCHIVES DU TEMPS — règles de la version jouable

Un artefact a disparu des Archives du Temps. Une solution cachée est tirée au hasard : **un suspect, un artefact, un lieu, un mobile**.
Les 38 autres cartes sont distribuées. Le premier qui accuse juste gagne.

## Les cartes (42)
- **10 suspects** (= les 10 personnages jouables) · **10 artefacts** · **12 lieux** · **10 mobiles**.
- La partie dure en moyenne ~15 manches ; avec des IA seules, 100 % des enquêtes simulées sont résolues.

## Le plateau : ta carte du monde
- 17 monuments reliés par les chemins de pièces. **12 lieux principaux** (Tour Eiffel, Colisée, Pyramides, Chichén Itzá, Grande Muraille, Taj Mahal, Petra, Machu Picchu, Atlantide, Angkor Wat, Stonehenge, Bibliothèque d'Alexandrie) où l'on peut formuler des hypothèses, et **5 sites secondaires** (Big Ben, Statue de la Liberté, Moaï, Torii de Miyajima, Opéra de Sydney) où l'on ne consulte que le témoin.
- **15 PNJ** : un par site secondaire, les 10 autres sur les lieux principaux (sauf la Tour Eiffel et la Bibliothèque d'Alexandrie).
- Tout le monde part de la Tour Eiffel (le hub lumineux de la carte).

## Un tour
1. **Pouvoir spécial** (si disponible).
2. **Déplacement** : jusqu'à 3 pas le long des chemins (sites fermés exclus).
3. **PNJ** (entretien interactif : le PNJ se présente avec une réplique et un **niveau de confiance de 1 à 5 étoiles**, puis tu choisis : **l'écouter** = 1 indice sûr ; **le presser** = n/5 de chances d'obtenir le double d'indices, sinon il se ferme pour de bon ; **poursuivre** = tu ne le « consommes » pas) : arriver sur un site secondaire donne un **témoignage** ; sur un lieu principal, tu peux au choix **interroger le PNJ local à la place d'une hypothèse**. Chaque témoignage est donné une fois par enquêteur et par PNJ : « cette carte n'a rien à voir » ou « le coupable est A ou B ». Les témoignages sont toujours vrais.
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
| L'Alchimiste | chaque carte montrée en réfutation lui livre un indice de plus dans la même catégorie |
| La Linguiste | ses témoignages de PNJ sont toujours de la forme « A ou B » |
| Le Collectionneur | commence avec un mobile innocenté |
| L'Horloger | une fois : après son hypothèse, remonte le temps et se déplace à nouveau |

## Les modes
- **Enquête classique** : premier à trouver la solution.
- **Course contre le temps** : 12 manches maximum, sinon les Archives se referment et personne ne gagne.
- **Archives vivantes** : à chaque manche, un événement possible — un site se ferme (faille temporelle) ou un témoin innocente publiquement une carte.

## Joueurs IA
Jusqu'à 6 joueurs au total. Les IA raisonnent comme un joueur : leurs cartes, ce qu'on leur montre, leurs indices, et l'historique public (qui a fait quelle hypothèse, qui a pu réfuter). Une hypothèse que personne ne peut réfuter leur livre la solution.

## Pas encore dans cette version (GDD)
Modes Coopération et Traître caché, 50+ artefacts, ailes par civilisation (la carte du monde les remplace), quêtes secondaires des PNJ, chat intégré.


## Rythme des IA
Les tours des IA sont espacés d'environ 3 secondes et diffusés un par un ; l'écran « Camp de base » affiche les dernières nouvelles et l'historique des hypothèses (qui a proposé quoi, qui a réfuté).
