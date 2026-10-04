# 0021 — Studio local d'abord : le calcul interactif dans le navigateur, refonte des moteurs

**Contexte.** La boucle d'édition doit répondre en une image (16 ms) pour le 2D et en moins d'une seconde pour la
3D après une retouche. L'architecture actuelle fait l'inverse : patronage et fabrication en Python sur le serveur,
drapé en tâche NATS (3 à 55 s), studio qui attend. L'[essai des tuniques](../suivi/essai-tuniques.md) a montré la
chaîne 2D complète en JavaScript : tracé et opérations en moins de 10 ms, dessin technique en 1 à 2 ms, planche de
patrons prête à couper, plan de coupe, PDF A4, DXF et SVG en quelques millisecondes ; et le moteur de drapé du dépôt
coud une tunique décrite par une GarmentSpec générée, coutures fermées à 0,1 mm, en 8,7 s sur le processeur.

**Décision.**

- **Tout le calcul interactif tourne dans le navigateur** : tracé et opérations, rendu 2D, pièces de coupe et
  exports, ajustement du mannequin (Worker), drapé 3D (Worker). Le studio fonctionne hors ligne une fois chargé.
- **Le serveur garde ce qui doit être partagé ou durable** : `designs` enregistre les versions du document
  (ADR 0020) en différé, sert les partages, et produit les exports à la demande avec **les mêmes moteurs sous
  Node** (API, traitements par lot). Les calculs longs (drapé haute qualité, rendus) passeront plus tard par la file.
- **Moteurs** :

| Moteur                                       | Décision                                                                                                                                                                                                             | Raison                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Patronage `engines/patterning` (Python)      | **Remplacé** par `engines/drafting` (TypeScript) : FreeSewing et fiches (ADR 0019), opérations (ADR 0020)                                                                                                            | Millisecondes au lieu d'un aller-retour, catalogue de ~80 modèles                   |
| Fabrication `engines/manufacturing` (Python) | **Porté** en TypeScript dans `engines/cutting` ; Python retiré après parité des références golden                                                                                                                    | Mêmes résultats en millisecondes, dans le navigateur et sous Node                   |
| Rendu 2D                                     | **Nouveau** `engines/flats` : dessins techniques face et dos (trait, couleur), planches, textures pour la 3D                                                                                                         | Écrit pendant l'essai ; une seule source pour le 2D et les textures 3D              |
| Drapé `engines/drape` (TypeScript)           | **Cœur XPBD gardé, enveloppe refaite** : API pas à pas en Worker, positions diffusées, maillage grossier pendant le geste et fin au repos, départ à chaud depuis la forme précédente, collisions par partie du corps | Placement déjà générique ; il faut l'interactivité et la robustesse sous l'aisselle |
| Mannequin `engines/mannequin` (TypeScript)   | **Gardé et étendu** : mesures FreeSewing, repères (point d'encolure, acromion, aisselle, crête iliaque), étiquettes de parties du corps                                                                              | Ajusté en moins d'une seconde dans un Worker                                        |

- **Langage** : TypeScript seul sur le chemin critique des phases 1 et 2. Python reste pour l'outillage de la
  documentation et pour l'IA et le tissu numérique (phases 3 et 4).
- **Aucun nouveau service en phase 1** : l'ADR 0001 reste le cadre des phases suivantes. Le chemin NATS du drapé est
  conservé pour les rendus haute qualité, mais sort de la boucle du studio.
- **Budgets vérifiés par des tests** : rejeu du document moins de 10 ms, dessin moins de 4 ms, première image 3D
  moins de 1 s, drapé posé moins de 5 s sur un portable de cinq ans, retouche 3D moins de 1 s à chaud. Un palier
  WebGPU n'est ajouté que si les mesures l'exigent, par une ADR.

**Conséquences.**

- Remplace en partie : l'ADR 0003 (moteurs de calcul en Python), l'ADR 0009 et l'ADR 0012 (fabrication en Python
  servie par `designs` : le service garde la route, le calcul change de moteur), l'ADR 0010 (GarmentCode) et
  l'ADR 0013 pour le mode d'exécution du drapé (le cœur et ses critères restent).
- Moins de conteneurs et de langages ; la pile locale (`pnpm stack:up`) perd deux moteurs Python au retrait.
- Le poste client devient la contrainte : niveaux de qualité, budgets en test, mesures sur des appareils modestes.
- Les moteurs gardent leurs règles : cœur pur et déterministe, `ENGINE_VERSION`, références golden, aucune API du
  DOM dans le cœur, une entrée Worker et une entrée Node.
