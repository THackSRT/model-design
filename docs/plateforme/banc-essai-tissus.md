# Banc d'essai des tissus

Les sept préréglages de tissu du moteur de drapé (`cotton-poplin`, `cotton-wax`, `bazin`, `linen`, `denim`,
`silk-satin`, `jersey`) sont des **estimations** (ADR 0013). L'onglet **Tissus** du studio permet à un modéliste de
les vérifier par des essais d'atelier simples, de rendre un verdict par tissu et d'exporter un **rapport de
validation** (ADR 0015). Rien n'est enregistré sur un serveur en phase 1 : le rapport est un fichier JSON, conforme
au contrat `contracts/schemas/drape/fabric-validation-report.schema.json`, que l'on peut réimporter pour reprendre
le travail.

## Déroulé

1. Ouvrir le studio (<http://localhost:8080> avec la pile Docker, <http://localhost:5173> en développement), onglet
   **Tissus** (adresse `#tissus`).
2. Choisir un préréglage dans la liste.
3. Saisir les essais d'atelier réalisés, chacun facultatif :
   - **pesée** d'un échantillon découpé (masse et aire) → grammage en g/m² ;
   - **épaisseur** (une ou plusieurs lectures) → mm ;
   - **allongement d'une bande** de 50 mm de large, chaîne et trame, sous une charge connue → % ramené à 10 N
     (hypothèse linéaire, signalée comme extrapolée si la charge est loin de 10 N) ;
   - **porte-à-faux** au cantilever (ASTM D1388, plan à 41,5°) → longueur de flexion puis rigidité de flexion en
     µN·m (à partir du grammage pesé, sinon estimé : la peser est conseillé) ;
   - **plan incliné** (angle de glissement) → coefficient de frottement μ = tan θ.
4. Lire le tableau des écarts : valeur estimée, mesurée, écart, tolérance, conformité. Le studio propose un verdict.
5. Lancer, si besoin, l'**essai de drapé de Cusick simulé** pour les valeurs estimées et pour les valeurs candidates
   (mesures dans les bornes du contrat, sinon estimation), et le comparer au coefficient mesuré au drapomètre s'il
   est connu.
6. Rendre le verdict : **validé** (estimation conservée), **corrigé** (valeurs à substituer, préremplies) ou **à
   revoir**, avec un commentaire facultatif — sans nom ni donnée de client.
7. Exporter le rapport. Un développeur l'applique ensuite au moteur (procédure dans `engines/drape/AGENTS.md`).

## Essai de drapé de Cusick simulé

Une éprouvette **circulaire** de 300 mm de diamètre est posée sur un disque de 180 mm (BS 5058 / ISO 9073-9) et
tombe sous son poids, simulée par `@atelier/drape` dans un Web Worker du studio. Le **coefficient de drapé** est
DC = (aire de l'ombre projetée − aire du disque) / (aire de l'éprouvette − aire du disque) :

- DC proche de **0** : le tissu tombe presque à la verticale (très souple, drape beaucoup) ;
- DC proche de **1** : le tissu reste presque à plat (raide).

Ordres de grandeur avec les préréglages actuels : satin de soie ≈ 0,31, popeline ≈ 0,40, denim ≈ 0,74. Un essai
dure 0,75 à 2 s à 7,5 mm de maille. Un essai qui n'a pas atteint l'équilibre dans le nombre de pas prévu est
signalé, son coefficient est alors indicatif. La tolérance de comparaison avec un coefficient mesuré est ± 0,05.

## Pour aller plus loin

- [ADR 0015 — Banc d'essai des tissus](../adr/0015-banc-d-essai-des-tissus.md) : formules, tolérances, limites.
- [ADR 0013 — Drapé physique](../adr/0013-drape-physique.md) : moteur de drapé et paramètres des tissus.
