# Feuille de route et suggestions

Objectif final : un **moteur de création de design assisté par IA**, livré en application web,
qui va de l'idée (photo, texte, croquis) jusqu'aux patrons prêts à couper.

## 1. Principe directeur : l'IA propose, le moteur garantit

Ne pas demander à une IA de dessiner directement des patrons : la géométrie générée serait
imprécise et non cousable. Séparer trois couches :

1. **Style** : ce que le vêtement est (type, encolure, manches, ornements, couleurs).
   C'est un objet JSON, et c'est là que l'IA intervient.
2. **Fit** : les mesures du client et les aisances.
3. **Moteur géométrique déterministe** : transforme style + fit en pièces exactes,
   comme le fait `js/pattern.js` dans ce prototype.

Le croquis, les patrons, le plan de coupe et la fiche technique sont tous dérivés de ces deux
objets. Une modification faite à un endroit se répercute partout.

## 2. Architecture web conseillée

| Couche | Choix proposé | Pourquoi |
| --- | --- | --- |
| Front | React + TypeScript, éditeur SVG (ou Paper.js) | Poignées d'édition, annuler / rétablir, rendu vectoriel net |
| Noyau patrons | Paquet TypeScript isolé, testé (repris de `pattern.js`) | Réutilisable côté client et serveur, testable unitairement |
| Back | API Node (NestJS) ou Python (FastAPI) | Comptes, ateliers, versions de modèles |
| Données | PostgreSQL (modèles, mesures, versions) + stockage objet (images, PDF) | Historique et partage |
| Exports | PDF A4/A0 tuilé avec repères d'assemblage, DXF-AAMA, SVG | A4 pour l'atelier, A0 pour le traceur, DXF pour les tables de coupe |
| IA | API Claude (vision + sortie JSON structurée) | Analyse d'images et de briefs vers des paramètres de style |

## 3. Modèle de données

Un vêtement est un **assemblage de composants paramétriques** :
`corps (tunique, chemise…) + encolure + manche + fermeture + ornements + finitions`.
Chaque composant déclare ses paramètres (avec bornes), ses pièces de patron, son rendu sur le
croquis et ses étapes de montage. Ajouter un col mao, une poche ou une broderie revient à ajouter
un composant, sans réécrire le reste.

## 4. Croquis, avatar et mannequins

Fait dans le prototype : un **avatar 3D paramétrique** construit à partir des mesures du client
(homme / femme, 15 mesures, silhouette), sur lequel la tenue est habillée à partir des cotes du
patron, en 4 vues. C'est la base commune pour les vues multiples et le « client virtuel ».

Suite proposée pour l'avatar :
- mesures supplémentaires (hauteurs mesurées plutôt que déduites, carrure dos, profondeur de
  poitrine) et postures (bras écartés, marche) ;
- simulation du tombé du tissu (modèle masse-ressort) pour les modèles amples ;
- export de l'avatar en glTF vers les outils 3D (CLO3D, Blender, Marvelous Designer).

Pour le croquis 2D :

- Constituer une bibliothèque de mannequins **propres ou sous licence** (homme, femme, enfant ;
  face, dos ; plusieurs poses), vectorisés avec `tools/vectorize_mannequin.py`.
- Annoter chaque mannequin avec des **points d'ancrage** (encolure, épaules, aisselles, taille,
  hanches, genoux, chevilles). Le rendu des vêtements s'appuie alors sur ces points : dans ce
  prototype, les contours sont encore calés à la main sur un seul mannequin.
- Ajouter les **dessins techniques à plat** (face et dos), très attendus par les ateliers.

## 5. Intégration de l'IA, par étapes

1. **Photo → paramètres** (priorité, gain immédiat) : un modèle de vision analyse la photo et
   renvoie un JSON conforme au schéma de style (type de pièce, encolure, longueurs relatives,
   ornements et leurs cotes, couleurs). C'est ce qui a été fait à la main pour MOD-001 ; cette
   étape l'automatise.
2. **Texte → design** : « kaftan col officier, broderie dorée au plastron, manches longues » est
   traduit en composition de composants. L'IA propose plusieurs variantes et le client choisit.
3. **Rendu réaliste** : génération d'images pour habiller le croquis de tissus et d'imprimés
   (wax, bazin, jacquard), puis essayage virtuel.
4. **Apprentissage atelier** : enregistrer les corrections faites après les toiles d'essai pour
   affiner les aisances et la gradation selon les morphologies.
5. **Mesures par photo** : estimation des mesures du client à partir de deux photos (face, profil),
   toujours vérifiées par un tailleur. Les mesures alimentent directement le créateur d'avatar.

## 6. Côté métier

- Faire **valider les blocs de base** par un modéliste et tester chaque taille sur toile.
- Tableaux de mesures normalisés (ISO 8559, EN 13402) et gradation automatique.
- Imbrication optimisée des pièces pour réduire la chute de tissu, estimation du coût
  (tissu, fournitures, temps de montage) et suivi des commandes.

## 7. Prochaines étapes concrètes

1. Couper et monter MOD-001 en taille M à partir du SVG 1:1 ; noter les écarts.
2. Ajouter l'export **PDF A4 tuilé** (repères d'assemblage, carré test sur chaque page).
3. Ajouter les dessins techniques à plat (face et dos) ; les vues 3D couvrent déjà face, dos et 3/4.
4. Passer le noyau en TypeScript avec des tests (longueur tête de manche = emmanchure + aisance,
   coutures appariées de même longueur, etc.).
5. Prototype « photo → JSON de style » avec l'API Claude sur une dizaine de modèles.
