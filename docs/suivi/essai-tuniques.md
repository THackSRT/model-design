# Essai des tuniques : preuve de concept de la chaîne 2D et premier drapé 3D

**Essai des 3 et 4 octobre 2026**, mené hors du dépôt sur cinq tuniques d'homme prises en photo (tunique grise à
galons, tunique blanche à plastron bogolan, tunique noire à plastron en pointe, caftan blanc brodé, tunique marine à
empiècement). Il fonde le [plan d'action](plan-action-plateforme.md) et les ADR 0019 à 0023. Les scripts, les
documents des cinq tuniques et les sorties (dessins, planches, PDF, DXF) sont dans l'archive
`essai-tuniques-sources.tar.gz` remise avec le plan.

## Verdict

La chaîne 2D complète tient dans le navigateur, en millisecondes, sans une ligne de code propre à un vêtement :
tracé, opérations, dessin technique, patrons prêts à couper, plan de coupe et exports. Le moteur de drapé du dépôt
coud une tunique décrite de façon générique (coutures fermées) mais la rejette encore pour une pénétration sous
l'aisselle droite : c'est le premier chantier de la 3D.

## Ce qui a été fait

| Étape                  | Résultat                                                                                                                                        | Temps à chaud (Node 22)        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Base                   | Brian, bloc homme de FreeSewing 4.10.2 : 10 tailles × 4 variantes (standard, tunique, ample, manche courte), 0 erreur, 100 % des sommets nommés | 4 à 7 ms                       |
| Fiche de couture       | Bords par rôle : milieu, ourlet, côté, emmanchure, épaule, encolure ; manche : dessous de bras, ourlet, tête                                    | —                              |
| Opérations             | 11 opérations génériques ; chaque tunique est une liste d'opérations (données), aucun code par vêtement                                         | moins de 0,1 ms                |
| Découpes               | Plastron en U, plastron en pointe, empiècement, bandes d'ourlet et de manche : 7 à 11 pièces par tunique                                        | moins de 0,2 ms                |
| Dessin assemblé        | Vues de face et de dos, au trait (style de l'image de référence) et en couleurs, motifs posés par pièce                                         | 1 à 2 ms                       |
| Patrons prêts à couper | Coupe et couture, valeurs par bord (1 cm, ourlets 2,5 cm, pli 0), crans simples devant et doubles dos, tête de manche, marques                  | 1 à 2 ms par planche           |
| Plan de coupe, métrage | Laize 150 cm pliée, pièces au pli contre le pli, droit fil parallèle aux lisières                                                               | quelques millisecondes         |
| Exports                | PDF A4 à assembler (27 à 44 pages utiles, 0,3 à 0,6 Mo), DXF de type AAMA (calques 1, 4, 7, 8, 14), SVG à l'échelle 1                           | PDF : impression du navigateur |
| Drapé 3D               | GarmentSpec générée, conforme au schéma ; drapé par le moteur du dépôt (voir plus bas)                                                          | 8,7 s (brouillon, processeur)  |

## Les cinq tuniques en opérations

| Tunique                       | Opérations                                                                                                              | Pièces | Métrage (laize 150 cm)                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------- |
| 1 · grise à galons            | encolure, patte 4 boutons, poignet mousquetaire, poche plaquée, galons (horizontal à droite, vertical à gauche), fentes | 11     | 2,80 m                                |
| 2 · blanche, plastron bogolan | encolure, fente d'encolure, manche courte, découpe plastron en U, bandes d'ourlet et de manche                          | 10     | 2,10 m de coton, 0,70 m de bogolan    |
| 3 · noire, plastron en pointe | mêmes opérations que la 2, plastron en pointe, autres matières                                                          | 10     | 2,10 m de coton, 0,70 m d'imprimé     |
| 4 · caftan brodé              | encolure en V, patte 6 petits boutons, zone de broderie, manche courte ample, fentes                                    | 7      | 2,60 m                                |
| 5 · marine à empiècement      | encolure, découpe empiècement, galon grecque, patte contrastée, poignet, fentes                                         | 11     | 2,70 m de marine, 0,40 m de bleu ciel |

La 3 réutilise la construction de la 2 avec un autre plastron et d'autres matières : c'est le cas d'usage du
document de modèle (ADR 0020).

## Premier drapé 3D avec le moteur du dépôt

- **Mise en œuvre** : moteurs compilés depuis le dépôt (`pnpm install --ignore-scripts`, puis `tsc` pour drape,
  mannequin, kernel, contracts-ts) ; mannequin homme de 1 860 mm, morphotype africain, bras à 90° (ADR 0018) ;
  repères : cou 1 607 mm, épaule 1 491 mm, taille 1 181 mm, hanche 961 mm ; ajusté en 0,9 s.
- **GarmentSpec** : devant et dos au pli, manche en paire, emmanchures et têtes de manche coupées en 8 bords appariés
  par fraction de longueur, ourlet ancré au repère de hanche (hauteur calculée pour que le point d'encolure tombe à la
  base du cou), manche ancrée au sommet de la tête sur le repère d'épaule ; conventions reprises du corsage à manches
  de référence. Conforme au schéma `garment-spec`.
- **Résultat** (tunique 1, bazin, brouillon) : 2 940 sommets, 163 pas, convergé, **coutures fermées à 0,1 mm**,
  devant, dos et manche gauche sans pénétration ; **manche droite : 34 sommets dans le bras sous l'aisselle**,
  jusqu'à 48 mm, du côté dos de la manche, 55 à 77 mm sous la ligne de carrure. Le moteur rend donc
  `body-penetration`.
- **Lecture** : la mise en place est bien générique (aucun nom de vêtement, ancrages par rôles et repères) ; le défaut
  touche la manche sous le bras en pose en T, comme le diagnostic ouvert du corsage à manches (1.46, ADR 0018). Il
  devient la tâche 1.72 du plan.

## Constats utiles au plan

- **Embu de tête de manche** : la tête de Brian mesure 616,2 mm pour 617,8 mm d'emmanchures (−1,5 mm) ; l'embu doit
  être déclaré dans la fiche (ADR 0019).
- **Mesures** : la taille 42 homme de FreeSewing a un dos de 502 mm et une hauteur de taille de 1 209 mm ; le
  mannequin à 1 860 mm donne des proportions proches. L'écart se règle par la stature et les nouveaux repères.
- **Manches courtes** : la plage de Brian s'arrête à −40 % ; l'opération « longueur de manche » coupe la pièce,
  pour toutes les bases.
- **Asymétrie** : les galons de la tunique 1 diffèrent à gauche et à droite ; la pièce se coupe au pli et les
  marques sont posées sur le devant déplié.

## Limites de l'essai

- Une seule taille ; pas de toile ; motifs dessinés et non tissus réels (en production : photos à plat des tissus).
- Manches stylisées dans le dessin assemblé (tombantes pour les longues, écartées pour les courtes).
- Pas de rendu 3D texturé : le drapé a été mesuré, pas encore affiché.
- Code d'essai hors du dépôt : il est repris et testé dans les lots 7 à 9.
