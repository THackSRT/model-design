# 5. Les moteurs

Sept moteurs font le travail technique ; les services métier les appellent, jamais l'inverse. Chaque moteur est sans état : il reçoit des entrées versionnées, rend des fichiers, et son résultat est mis en cache par empreinte des entrées.

| Moteur               | Entrées                                                 | Sorties                                                                            | Exécution                                 | Temps visé         |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- | ------------------ |
| Mannequin            | Mesures, sexe, âge, morphotype, silhouette              | Avatar glTF, mesures obtenues, silhouettes SVG, cartes 2,5D                        | Navigateur + service CPU                  | < 1 s              |
| Patronage            | Modèle (paramètres), mesures du corps                   | Spécification de patron (pièces, coutures, placement)                              | Service Python CPU                        | < 1 s              |
| Production atelier   | Spécification, tailles, laize, tissu                    | Pièces avec valeurs de couture, gradation, plan de coupe, fiche technique, exports | Service CPU, imbrication en tâche         | 1 à 30 s           |
| Drapé 3D             | Spécification, avatar, tissu                            | Vêtement drapé glTF, carte d'aisance                                               | Worker GPU                                | 5 à 60 s           |
| Rendu 2D / 2,5D / 3D | Avatar, drapé, motifs                                   | Vues trait, dessins techniques, images 2,5D, rendus réalistes                      | Navigateur + worker GPU                   | instantané à 1 min |
| Tissu numérique      | Photos du tissu avec mire, composition, grammage, laize | Texture raccordable, couleur calibrée, propriétés physiques, fichiers U3M / AxF    | Service Python CPU + worker GPU, en tâche | < 1 min            |
| IA                   | Texte, photos, notes vocales, contexte                  | Paramètres proposés, tâches, devis, mesures estimées                               | Service Python + fournisseurs de modèles  | 2 à 120 s          |

## 5.1 Moteur Mannequin

Il transforme un jeu de mesures en corps 3D fidèle, puis en vues 2D. Le prototype actuel le fait en 0,1 à 0,5 s dans le navigateur, avec un écart inférieur à 6 mm sur les tours.

1. **Contrôle des mesures** : bornes plausibles, comparaison avec l'historique du client, alerte sur les écarts.
2. **Complétion** : les mesures manquantes sont estimées par régression (stature, poids, âge, silhouette), en attendant les données réelles des ateliers.
3. **Composition du corps** : maillage MakeHuman (CC0) déformé par les cibles de sexe, âge, morphotype, corpulence et musculature.
4. **Ajustement** : chaque tour est mesuré comme au mètre ruban (section du maillage, enveloppe convexe) et corrigé par les cibles de mensuration jusqu'à l'écart visé.
5. **Pose et finition** : squelette et peau pour la posture, visage de mannequin sans traits (tête naturelle, yeux, nez et bouche effacés).
6. **Sorties** : avatar glTF (maillage + squelette), tableau cible / obtenu, silhouettes SVG à l'échelle, cartes de profondeur et de normales pour la 2,5D, fichier de mesures pour le patronage.

## 5.2 Moteur de Patronage

Il calcule les pièces d'un vêtement à partir d'un modèle paramétrique et des mesures. Il s'appuie sur la bibliothèque GarmentCode (licence MIT), étendue par nos propres composants.

1. **Bibliothèque de composants** : corsage, manches, cols, poignets, jupes, pantalons, et composants propres (kaftan, boubou, agbada, pantalon bouffant).
2. **Assemblage** : un modèle = composants + paramètres de design (longueurs, ampleurs, encolure, fermetures).
3. **Calcul** : les mesures du corps donnent la géométrie de chaque pièce (arêtes droites et courbes de Bézier), les paires de couture et le placement initial autour du corps.
4. **Contrôles** : longueurs de couture appariées, tête de manche comparée à l'emmanchure, contours fermés, bornes des paramètres.
5. **Retouches** : par curseurs, par déplacement direct de points contraints, ou par l'IA qui propose des changements de paramètres.
6. **Sortie** : spécification de patron JSON versionnée, source unique pour la production, le drapé et le rendu.

## 5.3 Moteur de Production atelier

Il rend la spécification utilisable en atelier.

- **Pièces de coupe** : valeurs de couture par arête, ourlets, crans, droit fil, pliures, repères de placement, étiquettes.
- **Gradation** : déclinaison par taille, ou recalcul direct pour le sur-mesure.
- **Plan de coupe** : imbrication des pièces sur la laize avec contraintes (droit fil, pliure, raccord des motifs imprimés), métrage et efficience.
- **Fiche technique** : nomenclature, cotes finies, fournitures, ordre de montage, contrôle d'aisance.
- **Exports** : PDF A4 à assembler et A0, SVG à l'échelle 1:1, DXF-AAMA / ASTM D6673 pour les tables de coupe.

## 5.4 Moteur de Drapé 3D

Il coud virtuellement les pièces sur l'avatar et simule le tombé du tissu.

1. **Maillage des pièces** : chaque pièce est triangulée ; ses coordonnées de texture sont celles du patron, ce qui place motifs et tissus au bon endroit.
2. **Placement** : les pièces sont disposées autour du corps selon le placement fourni par le patronage.
3. **Couture virtuelle** : des contraintes rapprochent les arêtes appariées jusqu'à fermeture.
4. **Simulation** : dynamique à base de positions sur GPU, collisions avec le corps et le vêtement lui-même, jusqu'à l'équilibre ; propriétés du tissu = grammage, rigidité de flexion, élasticité chaîne et trame, frottement.
5. **Sorties** : vêtement drapé glTF, carte des tensions et de l'aisance, mise en cache par (version du patron, avatar, tissu).

Première version : simulateur GPU côté serveur (NVIDIA Warp, comme GarmentCode, licence Apache 2.0). Plus tard : simulation légère dans le navigateur (WebGPU) pour les petites retouches.

## 5.5 Moteur de Rendu 2D, 2,5D et 3D

- **3D** : visionneuse web glTF, rotation libre, planche 4 vues.
- **2D** : trait par ruptures de profondeur (déjà prototypé), silhouettes vectorisées, dessins techniques à plat face et dos.
- **2,5D** : pour chaque vue, une image accompagnée de cartes de profondeur, de normales et de correspondance avec le patron ; motifs et tissus s'y posent en temps réel, avec ombrage, sans nouvelle simulation. C'est la vue des téléphones modestes.
- **Rendus réalistes** : tâche GPU pour la vitrine et la communauté.

## 5.6 Moteur IA (orchestrateur)

Il traduit une intention en appels aux autres moteurs ; il n'écrit jamais directement dans les données.

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
