# 0022 — Interface du studio v2 : une scène, un fil, des commandes

**Contexte.** Le studio doit être moderne, très simple et rapide à prendre en main par des stylistes et des
tailleurs, sur ordinateur comme sur tablette. Le studio actuel est un formulaire en onglets avec un bouton
« Calculer » ; chaque étape du flux (modèle, édition, matières, patrons, habillage, 3D) y serait un écran de plus.
Le calcul local (ADR 0021) permet maintenant de tout montrer en direct.

**Décision.**

- **Une scène** : le vêtement est toujours au centre ; ses vues (Dessin, Patron, 3D) se remplacent sur place, ou
  côte à côte sur grand écran. Pas de navigation de page pendant la création.
- **Un fil** : les six étapes (Modèle, Édition, Matières, Patrons, Habillage, 3D) forment un fil discret, jamais
  bloquant ; chaque étape change l'inspecteur et les actions proposées, pas la scène. Chaque étape montre son état
  (à faire, prête, à vérifier).
- **On touche le vêtement** : les zones du dessin (plastron, manche, encolure, poche…) viennent des régions du
  document ; au survol elles s'éclairent, au clic un **anneau d'actions** propose les opérations applicables à ce
  rôle ; des poignées règlent longueurs et courbes, avec aperçu immédiat.
- **Tout est commande** : chaque action est une commande typée, que l'on peut aussi lancer par la palette (⌘K ou
  « / »), par raccourci ou, plus tard, par l'assistant (ADR 0023). Tout s'annule et se rétablit ; l'historique des
  commandes est visible.
- **Dialogues utiles seulement** : un dialogue sert une tâche ciblée (Mesures, Tissu, Export, Partage,
  Comparaison de versions). Une action réversible ne demande jamais confirmation : elle s'applique, et un bandeau
  propose « Annuler ». Sur téléphone, les dialogues passent en plein écran.
- **Identité visuelle v2** : thème sombre par défaut (« atelier de nuit ») et thème clair, un accent lumineux, le
  trait du dessin technique (blanc sur anthracite) comme signature, mouvements courts et utiles réglés par jetons,
  `prefers-reduced-motion` respecté, WCAG 2.2 AA.
- **Architecture du front** : les quatre couches des directives (jetons, composants, vues, modèles de vue) restent ;
  s'y ajoutent dans `packages/features` le magasin du document et le bus de commandes, et des Workers pour le calcul.
  Les rendus passent par `engines/flats` (2D) et `packages/viewer3d` (3D).
- **Budgets** : mise à jour 2D en moins de 16 ms, réponse à un geste en moins de 100 ms, première image 3D en moins
  d'une seconde, paquet d'entrée sous 350 ko compressés (3D chargée à la demande).
- **Vérifié avec des utilisateurs** : à chaque porte de lot, cinq tailleurs ou stylistes réalisent une tâche type
  (une des cinq tuniques de l'essai) ; temps, erreurs et blocages sont notés.

**Conséquences.**

- Nouveaux composants : scène, fil, inspecteur, palette de commandes, anneau d'actions, poignée, feuille latérale,
  dialogue, bandeau d'annulation, nuancier ; histoires Storybook et captures comparées (ADR 0016).
- L'ancien studio reste derrière un drapeau jusqu'à la parité du nouveau, puis il est retiré.
- Une maquette interactive sert de référence de conception ; les écrans réels peuvent s'en écarter si les tests
  d'usage le demandent.
