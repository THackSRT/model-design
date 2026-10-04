# 0020 — Document de modèle et opérations génériques

**Contexte.** Le studio doit permettre de partir d'un modèle et de l'éditer (poche, bande, découpe, galon,
broderie, fermeture…), puis de choisir une matière par pièce, sans écrire de code par vêtement. Aujourd'hui un
modèle est un type de vêtement et ses paramètres, et chaque nouvelle variante demande un travail dans le moteur.
L'[essai des tuniques](../suivi/essai-tuniques.md) a décrit cinq vêtements réels comme une base et une liste
d'opérations : onze opérations, aucune ligne de code propre à un vêtement, moins de 0,1 ms pour les rejouer.

**Décision.**

- **Un modèle est un document** : une base (entrée du catalogue, version, options), une référence aux mesures, une
  liste ordonnée d'opérations, les matières et leur affectation aux pièces ou zones. Le rejouer est déterministe : il
  donne la GarmentSpec (pièces, bords à rôles, coutures, marques de pose) et tout ce qui en découle (dessins,
  patrons, drapé).
- **Une opération est générique** : elle ne lit que des rôles de bords (encolure, épaule, emmanchure, côté, ourlet,
  milieu, tête de manche, dessous de bras) et des repères ; elle ne connaît aucun nom de vêtement. Chaque opération a
  un schéma JSON (contrat), une fonction pure sur les pièces à rôles et une validation (coutures appariées, longueurs,
  bornes). Une règle de lint refuse les noms de vêtements dans le code des opérations, et un test compose des
  vêtements au hasard pour le prouver.
- **Partir du neutre, tout modifier** : la base seule est un vêtement neutre (une matière unie, sans découpe, sans
  bande ni motif) et c'est le point de départ par défaut ; les modèles d'exemple ne sont que des documents déjà
  remplis. Toute opération reste modifiable à tout moment : paramètres, place dans la liste, masquage (gardée mais
  non rejouée), suppression. Une opération suivante ne fige jamais une précédente.
- **Annuler, c'est rejouer** : le document garde l'ordre des opérations ; annuler retire ou rétablit une opération et
  rejoue. Le budget est de 10 ms pour un rejeu complet (tracé compris).
- **Catalogue d'opérations 1** (repris de l'essai) : encolure ronde ou en V, fente d'encolure, longueur de manche,
  poignet (droit ou mousquetaire, avec patte de fente), bande rapportée (ourlet, bas de manche), découpe (plastron,
  empiècement, blocs de couleur), patte de boutonnage, poche plaquée, galon, zone de broderie, fente de côté.
  S'y ajoutent les **opérations libres**, pour faire n'importe quelle modification : **découpe libre** (chemin tracé
  à main levée, ancré aux bords qu'il croise ; symétrique sur une pièce coupée au pli, libre sur une pièce dépliée),
  **déformation de bord** (longueur, aisance, évasement, arrondi d'ourlet) et **matière par région**. Les points d'un
  chemin (découpe, galon) restent des poignées : les déplacer modifie l'opération elle-même. Ensuite : col et pied de
  col, capuche, fronces, pince déplacée, ampleur, doublure.
- **Contrats** : `design-document` et `design-operation` (union des schémas d'opération) ; GarmentSpec 1.1, élargie
  de façon compatible : rôle sémantique des bords, matière des pièces, marques de pose (poche, galon, boutons, zone
  de broderie), crans déclarés.
- **Stockage** : `designs` enregistre les versions du document (JSONB) ; la GarmentSpec devient une donnée dérivée,
  recalculée ou mise en cache par empreinte du document et de la version des moteurs.

**Conséquences.**

- Le document est la source unique pour l'interface, l'IA (ADR 0023), les tests et le serveur ; tout ce qui modifie
  un modèle passe par une opération.
- La valeur métier se déplace des tracés vers les opérations et les fiches : chaque opération ajoutée sert tous les
  modèles du catalogue dont les rôles conviennent.
- Une modification libre reste paramétrique : elle est enregistrée par rapport aux rôles et aux repères, et suit donc
  une nouvelle taille ou de nouvelles mesures.
- Les versions existantes de `designs` (paramètres du patronage Python) sont des données d'essai : elles sont
  converties ou abandonnées au retrait de `engines/patterning` (ADR 0019).
