# 5. Les moteurs

Sept moteurs font le travail technique ; les services métier et le studio les appellent, jamais l'inverse. Chaque moteur est sans état : il reçoit des entrées versionnées, rend des fichiers, et son résultat est mis en cache par empreinte des entrées.

!!! note "Refonte d'octobre 2026 ([ADR 0021](../adr/0021-studio-local-et-refonte-des-moteurs.md))"
Les moteurs de la boucle d'édition passent en TypeScript et tournent dans le navigateur comme sous Node : le
tracé FreeSewing et les opérations (`engines/drafting`, ADR 0019 et 0020) remplacent le patronage Python, la
fabrication est portée dans `engines/cutting`, le rendu 2D devient `engines/flats`, le drapé garde son cœur et
devient interactif dans un Worker. Le tableau ci-dessous décrit la cible ; les sections disent ce qui existe.

| Moteur               | Entrées                                                 | Sorties                                                                            | Exécution                                               | Temps visé                  |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| Mannequin            | Mesures, sexe, âge, morphotype, silhouette              | Avatar glTF, mesures obtenues, silhouettes SVG, cartes 2,5D                        | Navigateur + service CPU                                | < 1 s                       |
| Tracé et opérations  | Document de modèle (base, opérations), mesures          | Spécification de patron (pièces à rôles, coutures, placement, marques)             | Navigateur et Node, TypeScript                          | < 10 ms                     |
| Production atelier   | Spécification, tailles, laize, tissu                    | Pièces avec valeurs de couture, gradation, plan de coupe, fiche technique, exports | Navigateur et Node, TypeScript                          | ms à quelques s             |
| Drapé 3D             | Spécification, avatar, tissu                            | Vêtement drapé (positions diffusées, glTF), cartes d'aisance et de tension         | Worker du navigateur ; tâche NATS pour la haute qualité | 1re image < 1 s, posé < 5 s |
| Rendu 2D / 2,5D / 3D | Spécification, matières, avatar, drapé                  | Dessins techniques face et dos, planches, textures, vues 3D, rendus réalistes      | Navigateur (`engines/flats`, viewer3d) + worker GPU     | < 4 ms (2D) à 1 min         |
| Tissu numérique      | Photos du tissu avec mire, composition, grammage, laize | Texture raccordable, couleur calibrée, propriétés physiques, fichiers U3M / AxF    | Service Python CPU + worker GPU, en tâche               | < 1 min                     |
| IA                   | Texte, photos, notes vocales, contexte                  | Lots de commandes proposés (ADR 0023), tâches, devis, mesures estimées             | Passerelle serveur + fournisseurs de modèles            | 2 à 120 s                   |

## 5.1 Moteur Mannequin

Il transforme un jeu de mesures en corps 3D fidèle, puis en vues 2D. Le prototype actuel le fait en 0,1 à 0,5 s dans le navigateur, avec un écart inférieur à 6 mm sur les tours.

1. **Contrôle des mesures** : bornes plausibles, comparaison avec l'historique du client, alerte sur les écarts.
2. **Complétion** : les mesures manquantes sont estimées par régression (stature, poids, âge, silhouette), en attendant les données réelles des ateliers.
3. **Composition du corps** : maillage MakeHuman (CC0) déformé par les cibles de sexe, âge, morphotype, corpulence et musculature.
4. **Ajustement** : chaque tour est mesuré comme au mètre ruban (section du maillage, enveloppe convexe) et corrigé par les cibles de mensuration jusqu'à l'écart visé.
5. **Pose et finition** : squelette et peau pour la posture, visage de mannequin sans traits (tête naturelle, yeux, nez et bouche effacés).
6. **Sorties** : avatar glTF (maillage + squelette), tableau cible / obtenu, silhouettes SVG à l'échelle, cartes de profondeur et de normales pour la 2,5D, fichier de mesures pour le patronage.

## 5.2 Moteur de tracé et d'opérations

**Cible (`engines/drafting`, lot 7)** : le document de modèle est rejoué à chaque geste ([ADR 0020](../adr/0020-document-de-modele-et-operations.md)).

1. **Tracé** : un modèle FreeSewing épinglé (4.10.2, MIT) trace les pièces de base aux mesures, en métrique
   ([ADR 0019](../adr/0019-trace-freesewing.md)).
2. **Fiche de couture** : chaque modèle du catalogue a sa fiche ; elle nomme les bords par plages de points
   (encolure, épaule, emmanchure, côté, ourlet, milieu, tête de manche, dessous de bras), déclare coutures, pinces,
   embu, coupe, placement et crans. Chaque tracé est contrôlé ; un tracé qui viole la fiche est rejeté.
3. **Opérations génériques** : poche, bande, découpe, galon, broderie, patte, poignet, encolure, fentes… ; chacune ne
   lit que des rôles et des repères, jamais un nom de vêtement.
4. **Sortie** : GarmentSpec 1.1 (pièces à rôles, coutures, marques de pose, matières), en moins de 10 ms tracé compris.

**Actuel (`engines/patterning`, gelé puis retiré à la parité)** : il calcule les pièces d'un vêtement à partir d'un modèle paramétrique et des mesures. Il s'appuie sur la bibliothèque GarmentCode (licence MIT), étendue par nos propres composants.

1. **Bibliothèque de composants** : corsage, manches, cols, poignets, jupes, pantalons, et composants propres (kaftan, boubou, agbada, pantalon bouffant).
2. **Assemblage** : un modèle = composants + paramètres de design (longueurs, ampleurs, encolure, fermetures).
3. **Calcul** : les mesures du corps donnent la géométrie de chaque pièce (arêtes droites et courbes de Bézier), les paires de couture et le placement initial autour du corps.
4. **Contrôles** : longueurs de couture appariées, tête de manche comparée à l'emmanchure, contours fermés, bornes des paramètres.
5. **Retouches** : par curseurs, par déplacement direct de points contraints, ou par l'IA qui propose des changements de paramètres.
6. **Sortie** : spécification de patron JSON versionnée, source unique pour la production, le drapé et le rendu.

## 5.3 Moteur de Production atelier

Il rend la spécification utilisable en atelier. Porté en TypeScript dans `engines/cutting` (lot 7, ADR 0021) : mêmes
sorties en quelques millisecondes, dans le studio comme dans `designs` ; `engines/manufacturing` (Python) est retiré
quand les références golden sont retrouvées. L'essai des tuniques a déjà produit valeurs par bord, crans simples et
doubles, plan de coupe avec métrage, PDF A4, DXF et SVG.

- **Pièces de coupe** : valeurs de couture par arête, ourlets, crans, droit fil, pliures, repères de placement, étiquettes.
- **Gradation** : déclinaison par taille, ou recalcul direct pour le sur-mesure.
- **Plan de coupe** : imbrication des pièces sur la laize avec contraintes (droit fil, pliure, raccord des motifs imprimés), métrage et efficience.
- **Fiche technique** : nomenclature, cotes finies, fournitures, ordre de montage, contrôle d'aisance.
- **Exports** : PDF A4 à assembler et A0, SVG à l'échelle 1:1, DXF-AAMA / ASTM D6673 pour les tables de coupe.

## 5.4 Moteur de Drapé 3D

Il coud virtuellement les pièces sur l'avatar et simule le tombé du tissu (ADR 0013).

1. **Avatar recalculé** : le moteur recalcule le mannequin depuis les mesures et les options (`@atelier/mannequin`), garanti compatible avec le patronage.
2. **Positionnement initial** : les pièces sont placées autour du corps selon les repères fournis par le patronage (`Panel.placement` : zone, côté, sens, ancrage, aisance).
3. **Maillage triangulaire** : Delaunay contrainte des pièces à pas régulier h (25 mm en brouillon, 15 mm en standard ; arêtes ≤ 1,2 h, angle minimal > 20°) ; vêtement complet à plat `meshGarment` avec pièces sur pliure dépliées, copies miroir pour `quantity: 2`, coutures appariées point à point, droit fil par triangle ; limites : 40 pièces, 2 000 bords, 30 000 sommets ; cinq vêtements de référence se maillent en 0,02 à 0,17 s (jupe cercle standard : 9 756 sommets).
4. **Simulation physique** : dynamique à base de positions étendue (XPBD) sur CPU, sans dépendance ; étirement anisotrope chaîne/trame, flexion isométrique, coutures virtuelles, collision avec le corps et frottement, arrêt au repos ou au nombre d'itérations fixé.
5. **Habillage géométrique** : approximation instantanée en anneaux horizontaux (35–50 ms, `dressMannequin()`) pour aperçu pendant le calcul du drapé.
6. **Sorties** (à venir, 1.19f) : vêtement drapé glTF binaire (mètres, `POSITION`, `NORMAL`, `TEXCOORD_0` du patron, attributs personnalisés `_EASE_MM` et `_STRAIN`), mis en cache par (version du patron, avatar, tissu, ENGINE_VERSION) dans S3.
7. **Routes dans le service `designs`** : `POST …/versions/{n}/drapes` demande un drapé (idempotent : même tissu, avatar et finesse sur la même version) ; `GET …/drapes/{drapeId}` lit l'état ; `GET …/drapes/{drapeId}/model` récupère le glTF depuis S3.
8. **Tâche** : demande asynchrone par le flux NATS `DRAPE_JOBS` (file de travail, 24 h), déjà publiée par `designs` ; le travailleur du moteur et la publication de `drape.completed` ou `drape.failed` sont à venir (1.19f) ; types d'erreur stables : placement manquant, échec du placement, couture non fermée, pénétration du corps, trop volumineux.

**Évolution (lot 9, ADR 0021)** : le cœur XPBD et la mise en place générique restent ; s'y ajoutent une API pas à
pas exécutée dans un Worker (positions diffusées à l'écran), un maillage grossier pendant le geste et fin au repos,
un départ à chaud depuis la forme précédente (coordonnées à plat), des collisions par partie du corps et un budget
vérifié (première image en moins d'une seconde, posé en moins de 5 s). L'essai des tuniques a cousu une tunique
générée (coutures fermées à 0,1 mm, 8,7 s en brouillon) et relevé une pénétration sous l'aisselle droite (tâche 1.72).

Implémentation actuelle : TypeScript sur CPU (paquet `@atelier/drape`, ENGINE_VERSION 0.12.0). La jupe droite en brouillon donne un résultat valide (convergence en 116 pas, aucune pénétration, coutures fermées, aisance bassin ~6 mm) ; autres vêtements à affiner (ceinture, épaules, pantalon jambe par jambe). GPU (WebGPU navigateur, ou Warp serveur) viendra par une nouvelle ADR si les performances le justifient. Propriétés des sept tisus préréglés (cotton-poplin, wax, bazin, linen, denim, silk-satin, jersey) : estimées, à faire valider.

## 5.5 Moteur de Rendu 2D, 2,5D et 3D

- **3D** : visionneuse web glTF, rotation libre, planche 4 vues.
- **2D** (`engines/flats`, lot 7) : dessins techniques face et dos au trait (signature visuelle du studio) ou en couleurs, motifs posés par pièce, planches de patrons, textures des pièces pour la 3D ; silhouettes vectorisées du mannequin pour l'habillage 2D.
- **2,5D** : pour chaque vue, une image accompagnée de cartes de profondeur, de normales et de correspondance avec le patron ; motifs et tissus s'y posent en temps réel, avec ombrage, sans nouvelle simulation. C'est la vue des téléphones modestes.
- **Rendus réalistes** : tâche GPU pour la vitrine et la communauté.

## 5.6 Moteur IA (orchestrateur)

Il traduit une intention en appels aux autres moteurs ; il n'écrit jamais directement dans les données. Dans le studio, sa seule interface est le catalogue des commandes : il propose un lot de commandes que l'utilisateur prévisualise puis accepte ([ADR 0023](../adr/0023-preparation-ia.md)).

- **Passerelle de modèles** : modèles de langage multimodaux par API, et modèles auto-hébergés pour les tâches spécialisées.
- **Outils** : chaque action de l'IA est un appel d'API d'un moteur (proposer des paramètres, créer une tâche, préparer un devis), validé par schéma et bornes.
- **Tâches** : photo ou texte vers modèle paramétrique (approche Design2GarmentCode / ChatGarment), retouches en langage naturel, notes vocales vers tâches, devis, mesures par photo, modération, recherche par image (modèles et tissus), recommandation de tissus adaptés au modèle et au budget, prévision de la demande et du réassort pour les vendeurs de tissus.
- **Validation humaine** : toute proposition reste un brouillon jusqu'à l'accord de l'utilisateur ; le journal garde qui a validé quoi.

## 5.7 Moteur Tissu numérique

Il transforme un tissu réel en tissu numérique que tous les autres moteurs savent lire : le vendeur photographie un coupon, et le styliste, l'atelier et le client voient ce tissu sur le patron, sur le mannequin et dans le plan de coupe.

- **Numérisation** : photo au téléphone avec une mire de couleur et une règle ; redressement, correction de couleur, extraction du motif raccordable (rapport de motif en cm, sens, symétries). Les tissus haut de gamme peuvent passer par un scanner de matière.
- **Propriétés physiques** : composition, grammage, laize, élasticité, rigidité, frottement, retrait au lavage. Elles sont saisies par le vendeur ou déduites de la composition par une table de référence, puis affinées par des essais simples (drapé, étirement).
- **Formats** : U3M (format ouvert d'échange de matières numériques) et AxF (scanners de matière), pour échanger avec CLO, Style3D ou Browzwear.
- **Usages** : le Drapé lit les propriétés physiques ; le Rendu pose la texture sur les pièces à plat (coordonnées de texture = patron) ; la Production tient compte de la laize, du sens et du raccord de motif dans le plan de coupe et le métrage ; le Catalogue tissus affiche l'aperçu du tissu porté.
- **Contrôle** : le vendeur valide la fiche avant publication ; un tissu dont les propriétés ne sont pas mesurées est marqué « estimé » dans le drapé et dans le devis.
