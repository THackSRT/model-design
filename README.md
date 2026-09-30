# model-design — Atelier de design de vêtements assisté

Prototype web d'un outil qui transforme un modèle (photo) en **version numérique retouchable** :
croquis sur mannequin, **avatar 3D du client construit à partir de ses mesures**, tenue portée en
**4 vues** (3/4 droit, face, dos, 3/4 gauche), patrons à l'échelle 1:1, plan de coupe et fiche
technique, tous générés à partir des mêmes paramètres.

Il intègre aussi une **recommandation de taille en ligne** (dans l'esprit d'[Unisize](https://unisize.net/)) :
7 questions → mesures estimées → taille conseillée zone par zone → avatar habillé, avec une démo
d'intégration boutique (`boutique.html`). Analyse et plan : [docs/PRODUIT-TAILLE.md](docs/PRODUIT-TAILLE.md).

Premier modèle de test : **MOD-001 · Ensemble kaftan à chevrons** (tunique à col rond, manches
courtes passepoilées, ouverture milieu devant encadrée de deux passepoils, trois chevrons
appliqués, pantalon droit à ceinture coulissée).

## Lancer

Aucune installation : ouvrir `index.html` dans un navigateur (double-clic), ou servir le dossier :

```bash
npx serve .        # ou : python3 -m http.server
```

## Ce que fait le prototype

| Vue | Contenu |
| --- | --- |
| **Mannequin** | Mannequin réaliste construit à partir du maillage **MakeHuman (CC0)** : sexe, âge, morphotype (Afrique / Asie / Europe), corpulence et musculature, puis ajustement automatique des tours (cou, poitrine, taille, bassin, bras, poignet, cuisse, genou, mollet, cheville) et de la hauteur d'entrejambe, mesurés « au mètre ruban » sur le maillage (écart < 6 mm). Tête de mannequin de vitrine lisse, bras abaissés via le squelette MakeHuman. Rendu **trait 2D** (contours seuls) ou **volume 3D**, 4 vues, lignes de mesure, export **SVG des silhouettes** à l'échelle 1:1. |
| **Croquis** | La tenue dessinée en SVG sur le mannequin vectorisé, à côté de la photo de référence. Couleurs, nombre/taille des chevrons, longueurs, texture, chaussures et visibilité du mannequin sont réglables. |
| **Vues 3D** | (provisoire, avatar simplifié) La tenue portée par l'avatar du client, en planche 4 vues façon croquis (contours + lignes de construction en option). Glisser pour tourner. Export PNG. |
| **Avatar client** | Créateur d'avatar : homme ou femme, 15 mesures du corps (stature, tours, longueurs) et 3 réglages de silhouette (ventre, fessier, poitrine). Chaque tour de l'avatar est calé exactement sur la mesure. Fiche client et **contrôle d'aisance** (vêtement fini − corps) zone par zone. |
| **Trouver ma taille** | Questionnaire (sexe, âge, taille, poids, 4 pictogrammes de silhouette, coupe préférée). Mesures estimées par un modèle appris sur ANSUR II, taille recommandée avec confiance et détail par zone (serré ↔ ample), avatar portant la taille choisie. Bouton pour passer au sur-mesure avec les mesures estimées. |
| **Boutique (démo)** | `boutique.html` : fiche produit fictive avec le bandeau « Votre taille : M » et la fenêtre du widget ; le profil est mémorisé sur l'appareil pour tous les articles. |
| **Patrons** | 9 pièces tracées par calcul (devant, dos, manche, parementures, chevron, pantalon devant/dos, ceinture) avec valeurs de couture, droit fil, pliures, crans, repères de placement. Export SVG à l'échelle 1:1 avec carré test de 10 cm. |
| **Plan de coupe** | Placement automatique sur tissu plié (laize réglable), métrage et efficience. |
| **Fiche technique** | Nomenclature, cotes finies, fournitures, ordre de montage. |

Tailles S / M / L / XL (barèmes homme et femme) ou mesures sur mesure ; chaque changement met à jour
toutes les vues : l'avatar, la tenue portée, les patrons et le métrage restent cohérents.

## Organisation

```
index.html               interface (HTML + CSS)
js/geom.js               géométrie 2D : Bézier, longueurs, décalage des valeurs de couture
js/pattern.js            tracé paramétrique des pièces, rendu SVG, placement
js/croquis.js            dessin de la tenue sur le mannequin (croquis de mode 2D)
js/body.js               avatar paramétrique : corps construit à partir des mesures
js/garment.js            habillage 3D (tunique, manches, pantalon) à partir des cotes du patron + contrôle d'aisance
js/viewer3d.js           rendu three.js en 4 vues, style croquis (détection de contours)
js/app.js                état, contrôles, exports
js/catalog.js            modèles et barèmes de tailles (partagés atelier / boutique)
js/anthro-model.js       modèle « questionnaire → mesures » (généré, ANSUR II)
js/estimate.js           estimation des mesures à partir du questionnaire
js/recommend.js          moteur de recommandation de taille (aisances par zone)
js/sizefinder.js         composant « Trouver ma taille » (questionnaire + résultat + avatar)
css/sizefinder.css       styles du composant
boutique.html            démo d'intégration dans une boutique en ligne
tools/fit_anthropometry.py  entraînement du modèle d'estimation sur ANSUR II
vendor/three.min.js      three.js r128 (MIT), secours hors-ligne si le CDN est inaccessible
js/mannequin-data.js     mannequin vectorisé du croquis 2D (généré)
js/mh.js                 mannequin réaliste : cibles MakeHuman, mesure au mètre ruban, ajustement, pose, tête lisse
js/mh-data.js            maillage + cibles + squelette MakeHuman compressés (généré, CC0)
tools/build_makehuman.py construction de js/mh-data.js depuis le dépôt MakeHuman
tools/vectorize_mannequin.py   vectorisation du croquis mannequin (potrace)
references/              photo du modèle et croquis mannequin fournis
docs/ROADMAP.md          suggestions et feuille de route du projet
```

## Limites connues

- Les patrons reposent sur un **bloc de base simplifié** (méthode homme classique). Ils doivent être
  validés sur une toile d'essai avant toute production ; les corrections se reportent dans les mesures.
- Le croquis utilise les proportions stylisées (allongées) du mannequin de mode : il sert à la
  communication visuelle, les cotes qui font foi sont celles des patrons.
- L'avatar 3D respecte les tours mesurés ; les hauteurs non mesurées (poitrine, genou, cheville…)
  sont déduites de la stature par des proportions moyennes. La tenue 3D est un habillage géométrique
  (pas encore de simulation du tombé du tissu) : elle montre volumes, longueurs et aisances.
- L'estimation des mesures est apprise sur ANSUR II (militaires américains) : à recalibrer avec des
  mesures de la clientèle réelle avant un usage commercial (voir docs/PRODUIT-TAILLE.md).
- La planche 4 vues fournie en référence (image de banque d'images) a servi de modèle de style ;
  elle n'est pas intégrée à l'application.
- Le mannequin réaliste utilise les assets MakeHuman (maillage, cibles, squelette), publiés sous
  CC0 1.0 par la communauté MakeHuman (makehumancommunity.org) : usage commercial libre.
- Le mannequin fourni porte une signature d'auteur : pour un usage commercial, utiliser des
  mannequins créés en interne ou sous licence.
