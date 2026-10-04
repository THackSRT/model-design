# 0019 — Tracé 2D : FreeSewing derrière le contrat GarmentSpec, dans le navigateur

**Contexte.** Le patronage de la phase 1 (`engines/patterning`, tracés de GarmentCode réécrits en Python, ADR 0010)
tourne sur le serveur : quatre types de vêtement, des semaines de travail par type ajouté, un aller-retour réseau à
chaque calcul, un studio qui reste un formulaire avec un bouton « Calculer ». Deux essais ont mesuré une autre voie :

- [Essai de FreeSewing](../suivi/essai-freesewing.md) : 0,5 à 6 ms par tracé à chaud (Node, Chromium), 100 % des
  sommets nommés, fiches de couture valables sur 5 tailles et près de 2 000 combinaisons d'options, conversion en
  GarmentSpec conforme au schéma sur 3 340 tracés ; défauts connus et contournés (imports non déclarés, embu
  implicite, plan de coupe peu fiable, Penelope).
- [Essai des tuniques](../suivi/essai-tuniques.md) : Brian, le bloc homme de FreeSewing, sert de base aux cinq
  tuniques des photos de référence ; 4 à 7 ms par tracé, 0 erreur sur 10 tailles et 4 variantes.

FreeSewing (MIT) compte environ 80 modèles tracés à la mesure, écrits en JavaScript, sans dépendance au DOM.

**Décision.**

- **FreeSewing 4.10.2 devient le moteur de tracé 2D**, version épinglée, dans un nouveau moteur TypeScript
  `engines/drafting` qui tourne à l'identique dans le navigateur et sous Node (ADR 0021).
- **Le contrat ne change pas de maître** : FreeSewing ne produit que de la géométrie ; l'adaptateur la convertit en
  GarmentSpec à l'aide d'une **fiche de couture par modèle** (bords par plages de points nommés et leur rôle,
  coutures, pinces, coupe, placement, crans, embu déclaré). Aucun autre code ne lit FreeSewing.
- **Chaque tracé est contrôlé** : journal d'erreurs vide, bords de la fiche résolus, contour couvert, paires de
  couture dans la tolérance ; sinon le tracé est rejeté avec un message clair. Tracé toujours en métrique, sorties
  arrondies à 0,001 mm. L'embu se déclare dans la fiche, il ne se suppose jamais.
- **Catalogue 1** : Brian (tunique et chemise homme, base des cinq tuniques), Teagan (tee-shirt), Titan (pantalon),
  Sandy (jupe cercle), Bella (corsage, avec les garde-fous de l'essai) et une jupe droite écrite par nous sur l'API
  de FreeSewing (Penelope est écartée). Un modèle n'entre au catalogue que si son banc de validation passe.
- **Mesures** : `MeasurementSet` reçoit les mesures FreeSewing qui lui manquent (`hips` haut de hanches, `waistBack`,
  `seatBack`, `shoulderSlope`, `waistToArmpit`, `waistToHips`, `crossSeam`, `crossSeamFront`, `waistToUpperLeg`),
  en champs facultatifs : élargissement compatible (ADR 0002). Le mannequin fournit les mesures manquantes.
- **Installation** : `packageExtensions` de pnpm pour les cinq imports non déclarés ; avis de licence MIT livré avec
  le studio ; déclarations de types minimales pour la seule surface utilisée.
- **`engines/patterning` est gelé** : plus de nouveau vêtement ; il est retiré quand le catalogue 1 couvre ses
  quatre types (corsage, jupes, pantalon). Ses références golden restent dans l'historique comme références de
  recherche. L'ADR 0010 cesse de s'appliquer à ce retrait.

**Conséquences.**

- Le tracé tient dans le budget d'une image (moins de 10 ms avec les opérations, ADR 0020) : le studio peut tout
  recalculer à chaque geste, hors ligne compris.
- Dépendance à un projet communautaire : version épinglée, adaptateur seul point de contact, banc de validation des
  fiches (5 tailles, bornes des options, moins de 15 s par modèle) dans `pnpm check`. Une montée de version est un
  travail à part, avec ce banc.
- La sémantique (rôles, coutures, placement) est à notre charge, dans les fiches : c'est elle qui rend le reste
  générique (opérations, coupe, drapé).
- Licences : MIT, permise (ADR 0008). Les modèles FreeSewing restent attribués à leurs auteurs dans le studio.
