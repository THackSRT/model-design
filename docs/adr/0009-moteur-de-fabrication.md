# 0009 — Moteur de fabrication : géométrie et exports écrits par le moteur, imbrication simple et synchrone

**Contexte.** Les travaux 1.17 et 1.18 remplissent le squelette `engines/manufacturing` : pièces de coupe
(valeurs de couture par bord, crans, droit fil, pliure), gradation, plan de coupe, exports SVG 1:1, PDF A4 tuilé
et DXF-AAMA. Le prototype (`prototype/js/geom.js`, `pattern.js`) montre la méthode : décalage de chaque bord de
sa valeur de couture, raccord des bords voisins à l'intersection de leurs prolongements (biseau au-delà de trois
fois la valeur), placement en ligne d'horizon. Il faut choisir les bibliothèques (licences permises seulement :
MIT, Apache 2.0, BSD, ISC, CC0, Unlicense), le mode d'exécution (temps visé de 1 à 30 s, imbrication « en
tâche » selon l'architecture) et tenir les règles des moteurs : cœur pur, déterministe, millimètres, résultat
versionné.

**Décision.**

- **Contrat** : `contracts/openapi/manufacturing.yaml` et `contracts/schemas/manufacturing/`. Quatre routes
  synchrones, sans état : `POST /v1/cut-patterns` (pièces de coupe), `POST /v1/graded-patterns` (gradation),
  `POST /v1/cutting-plans` (plan de coupe), `POST /v1/exports` (fichier rendu directement, `image/svg+xml`,
  `application/pdf` ou `image/vnd.dxf`). Entrée commune : une `GarmentSpec` et des `FinishingOptions` (valeurs
  de couture par défaut, par rôle de bord, par bord ; crans). Erreurs RFC 9457 aux types stables listés dans le
  contrat. Le moteur n'est appelé que par les services (d'abord `designs`, plus tard `production`), jamais par
  les applications.
- **Géométrie sans bibliothèque.** Le cœur reprend et étend l'algorithme du prototype en Python pur : courbes de
  Bézier aplaties en 64 segments (comme `patterning`), décalage de chaque bord de sa valeur, raccord en onglet
  limité à 3 fois la plus grande valeur (biseau au-delà), suppression des petites boucles d'une courbe concave,
  puis contrôle : ligne de coupe simple (sans auto-intersection) et contenant la ligne de couture, sinon
  `/problems/cut-line-self-intersects`. Coordonnées arrondies à 0,01 mm en sortie. Shapely est écartée : BSD-3,
  mais ses roues embarquent GEOS sous LGPL-2.1. pyclipper est écartée : MIT pour l'enveloppe, mais elle compile
  la bibliothèque Clipper (licence Boost 1.0, hors liste) et ne décale que d'une valeur uniforme. numpy n'entre
  pas dans le moteur : ses roues embarquent libquadmath (LGPL-2.1) et le support d'exécution GCC (GPL-3.0 avec
  exception).
- **Crans** : entailles droites, de la ligne de coupe vers l'intérieur (profondeur : la valeur de couture,
  6 mm au plus ; 3 mm vers l'intérieur si la valeur est nulle ; crans multiples espacés de 4 mm). Crans demandés
  (bord, distance le long du bord depuis son début, 1 à 3) et crans automatiques `seam-junctions` : jonction de
  deux bords cousus dont la direction change de moins de 30° (ex. ligne de hanches d'une couture de côté).
- **Gradation par recalcul.** Le moteur ne porte pas de règles de gradation saisies : le service appelant fait
  calculer une `GarmentSpec` par taille par le moteur de patronage, puis le moteur de fabrication vérifie que les
  tailles ont les mêmes pièces et les mêmes bords (`/problems/sizes-mismatch`), les finit, les aligne (`origin`
  ou `grainline`) et rend les écarts de chaque sommet par rapport à la taille de base (`gradeRules`), base d'un
  futur export de règles (RUL).
- **Plan de coupe simple et déterministe.** Chaque pièce est tournée pour aligner son droit fil sur la longueur du
  tissu (x) ; sur tissu plié (par défaut), une pièce placée donne une paire et une pièce sur pliure pose sa pliure
  en y = 0 (`/problems/fold-not-on-grain` si sa pliure n'est pas parallèle au droit fil) ; à plat, elle est
  dépliée et les paires sont placées en symétrique. Placement « ligne d'horizon » (bas-gauche) sur les rectangles
  englobants, horizon tenu en segments, positions candidates aux débuts de segments ; ordre fixe : longueur
  décroissante, largeur décroissante, étiquette, identifiant de pièce, numéro. Le sens du tissu (`one-way`,
  `two-way`) est dans le contrat mais sans effet sur des rectangles : il servira au placement au contour réel.
  Métrage arrondi au millimètre supérieur, efficience à 4 décimales. Bornes : 20 vêtements, 50 exemplaires,
  500 placements (`/problems/too-many-pieces`).
- **Synchrone.** Toutes les routes répondent en moins d'une seconde dans ces bornes ; pas de tâche NATS pour
  l'instant (le worker des moteurs est à venir). Quand une imbrication au contour réel dépassera la seconde, elle
  arrivera comme tâche (`/v1/cutting-plan-jobs`, événements `cutting-plan.completed` et `cutting-plan.failed`,
  résultat dans le stockage S3), par une nouvelle ADR, la route synchrone restant en place.
- **Exports écrits par le moteur, sans bibliothèque.** Une planche commune (pièces rangées en étagères, sans
  rotation, sur la largeur de quatre pages A4 utiles, écart de 20 mm) sert au SVG, au PDF et à la position des
  pièces dans le DXF.
  - SVG : XML écrit par le moteur, `width`/`height` en `mm`, `viewBox` en millimètres (échelle 1:1), y inversé
    par calcul (textes droits).
  - PDF 1.4 minimal : vectoriel, police standard Helvetica non embarquée (WinAnsiEncoding), pages A4
    210 × 297 mm, marge de 10 mm, zones utiles bord à bord avec repères de raccord et nom de page (« A1 ») ;
    première page : plan d'assemblage et carré de contrôle de 100 mm. Ni date, ni identifiant de document, ni
    compression (la sortie de zlib varie selon la version de la bibliothèque du poste) : sortie identique octet
    pour octet.
  - DXF-AAMA : DXF R12 ASCII (AC1009), unités métriques, un bloc par pièce inséré à sa place sur la planche, calques AAMA
    (1 contour de coupe, 2 et 3 points d'angle et de courbe, 4 crans, 6 pliure, 7 droit fil, 14 ligne de couture,
    textes « Piece Name », « Quantity », « Size » ; à vérifier contre ASTM D6673 dans la tâche). Une taille par
    fichier ; le DXF gradué (avec fichier RUL) viendra plus tard.
  - Refusés : ezdxf (MIT, mais tire numpy, fonttools, pyparsing et typing_extensions pour un format texte simple),
    reportlab (BSD, mais tire Pillow sous MIT-CMU, hors liste, et date ses fichiers par défaut), fpdf2
    (LGPL-3.0).
- **Une seule dépendance nouvelle, pour les tests** : pypdf (BSD-3-Clause, aucune dépendance en Python 3.12),
  dans le groupe `dev` de l'espace de travail, pour relire les PDF produits. Les DXF sont relus par un petit
  lecteur de codes de groupe écrit dans les tests.
- **Structure** : `core/` (géométrie, finition, crans, gradation, imbrication), `export/` (planche et écrivains
  SVG, PDF, DXF : purs, rendent des octets, textes d'annotation par langue), `spec/` (conversions avec les
  contrats), `api/` (un module par ressource). import-linter : couches `main` > `api` > `spec` > `export` >
  `core` ; ni `core` ni `export` n'importent FastAPI, Pydantic, les contrats ou `engine-kit`.
- **Sécurité** : bornes dans les schémas ; les textes venus de la requête (noms et identifiants de pièces, taille,
  référence) sont échappés en XML (SVG), débarrassés des caractères de contrôle en DXF (un saut de ligne y
  injecterait des entités) et échappés en PDF (`\`, `(`, `)` ; caractères hors WinAnsi remplacés) ; le nom de
  fichier de `Content-Disposition` est construit par le moteur (`<garment.type>[-<taille>].<ext>`). Aucune mesure
  ni nom de client dans les fichiers (`SizeLabel` au jeu de caractères restreint) ; les corps de requête ne sont
  jamais journalisés.

**Licences vérifiées** (métadonnées des roues PyPI téléchargées le 30 septembre 2026) :

| Paquet                   | Licence                                                                          | Suite        |
| ------------------------ | -------------------------------------------------------------------------------- | ------------ |
| pypdf 6.19.0             | BSD-3-Clause ; aucune dépendance en Python 3.12                                  | Retenu (dev) |
| shapely 2.1.2            | BSD-3-Clause ; roue avec GEOS 3.13.1 (LGPL-2.1)                                  | Écarté       |
| pyclipper 1.4.0          | MIT (enveloppe) ; Clipper compilé dedans (Boost 1.0, selon le projet Clipper)    | Écarté       |
| numpy 2.2.6              | BSD-3-Clause ; roue avec libquadmath (LGPL-2.1+) et libgfortran (GPL-3.0 + exc.) | Écarté       |
| ezdxf 1.4.4              | MIT ; dépend de numpy, fonttools (MIT), pyparsing (MIT), typing_extensions       | Écarté       |
| reportlab 5.0.1          | BSD ; dépend de Pillow 12.2.0 (MIT-CMU) et charset-normalizer                    | Écarté       |
| fpdf2 2.8.9              | LGPL-3.0-only                                                                    | Écarté       |
| typing_extensions 4.16.0 | PSF-2.0 (déjà présent à l'exécution par Pydantic) : licence ajoutée à la liste   | Accepté      |

**Conséquences.** Aucune dépendance d'exécution nouvelle, des sorties reproductibles octet pour octet et des
références golden possibles pour les exports ; en contrepartie, quelques centaines de lignes de géométrie et
d'écrivains de fichiers à tester nous-mêmes (propriétés Hypothesis : ligne de coupe simple, qui contient la ligne
de couture, à la bonne distance de chaque bord). Un décalage impossible (courbe plus serrée que sa valeur de
couture) donne une erreur explicite plutôt qu'un contour faux. Le placement sur rectangles gaspille du tissu sur
les pièces courbes : le métrage est prudent, jamais sous-estimé. Les exports ne valent qu'après la porte 1.25
(toile coupée depuis un PDF imprimé et un DXF ouvert dans un logiciel de CAO, utilisé comme outil et non comme
dépendance). Les valeurs métier par défaut (10 mm, ourlet 30 mm, tissu plié, marges) sont celles du contrat et
restent à valider par un modéliste ; les changer, comme changer un calcul, change `ENGINE_VERSION`. Revoir cette
décision si une bibliothèque permissive de géométrie robuste sans composant LGPL apparaît, ou si l'imbrication au
contour réel l'exige.

**Décisions de l'utilisateur (30/09/2026).** Valeurs par défaut confirmées : couture 10 mm, ourlet 30 mm,
0 sur une pliure. PDF A4 bord à bord avec repères de raccord (sans recouvrement). Gradation par recalcul à
partir de barèmes de mesures fournis par la requête, une série par taille ; un barème de tailles géré par un
service viendra en phase 2. La licence PSF-2.0 rejoint la liste des licences permises (`typing_extensions`).
