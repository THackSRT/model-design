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
  rôle ; des poignées règlent longueurs et courbes, avec aperçu immédiat. Quatre outils libres complètent l'anneau :
  **Découper** (tracer une découpe n'importe où, ancrée aux bords), **Déformer** (poignées d'ourlet, de côté,
  d'encolure, de manche), **Ajouter** (poche, patte, poignet, bande, galon), **Matière** (poser un tissu sur une
  région).
- **Partir du neutre, ajuster jusqu'au résultat** : une création part par défaut d'une base neutre (tissu uni, sans
  motif ni bande) ; chaque modification s'applique en direct et reste réglable ensuite : régler, masquer ou
  supprimer une opération, comparer deux versions. Les modèles d'exemple sont un raccourci, jamais un passage
  obligé.
- **Tout est commande** : chaque action est une commande typée, que l'on peut aussi lancer par la palette (⌘K ou
  « / »), par raccourci ou, plus tard, par l'assistant (ADR 0023). Tout s'annule et se rétablit ; l'historique des
  commandes est visible.
- **Dialogues utiles seulement** : un dialogue sert une tâche ciblée (Mesures, Tissu, Export, Partage,
  Comparaison de versions). Une action réversible ne demande jamais confirmation : elle s'applique, et un bandeau
  propose « Annuler ». Sur téléphone, les dialogues passent en plein écran.
- **Identité visuelle v2** : deux thèmes complets, **clair** et **sombre**, au choix de l'utilisateur (préférence
  du système par défaut) ; un écran est entièrement dans l'un ou dans l'autre, jamais un mélange des deux. Langage
  sobre et technique : gris neutres, un seul accent (terre cuite, ajusté pour chaque thème), filets fins, chiffres
  en chasse fixe, le trait du dessin technique comme signature (clair sur graphite, encre sur papier). **Aucun code
  « IA »** : ni dégradé, ni halo, ni flou, ni étincelle, ni violet ; l'assistant utilise les composants de tout le
  studio. Polices du système, sans police embarquée (une police sous licence OFL demanderait une ADR, licences de
  l'ADR 0008). Mouvements courts réglés par jetons, `prefers-reduced-motion` respecté, WCAG 2.2 AA dans les deux
  thèmes.
- **Architecture du front** : les quatre couches des directives (jetons, composants, vues, modèles de vue) restent ;
  s'y ajoutent dans `packages/features` le magasin du document et le bus de commandes, et des Workers pour le calcul.
  Les rendus passent par `engines/flats` (2D) et `packages/viewer3d` (3D).
- **Budgets** : mise à jour 2D en moins de 16 ms, réponse à un geste en moins de 100 ms, première image 3D en moins
  d'une seconde, paquet d'entrée sous 350 ko compressés (3D chargée à la demande).
- **Vérifié avec des utilisateurs** : à chaque porte de lot, cinq tailleurs ou stylistes réalisent une tâche type
  (une des cinq tuniques de l'essai) ; temps, erreurs et blocages sont notés.

**Conséquences.**

- Nouveaux composants : scène, fil, inspecteur, palette de commandes, anneau d'actions, poignée, outil de découpe,
  feuille latérale, dialogue, bandeau d'annulation, nuancier, bascule de thème ; histoires Storybook et captures
  comparées dans les deux thèmes (ADR 0016).
- Jetons v2 en deux jeux de mêmes noms (clair, sombre), contrastes vérifiés par un test pour chacun.
- L'ancien studio reste derrière un drapeau jusqu'à la parité du nouveau, puis il est retiré.
- Une maquette interactive sert de référence de conception ; les écrans réels peuvent s'en écarter si les tests
  d'usage le demandent.
