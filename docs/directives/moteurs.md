# 6. Moteurs de calcul

Un moteur est un cœur de calcul pur entouré d'adaptateurs minces : une API pour les appels rapides, un worker pour
les tâches de la file. Il ne possède pas de base de données et ne connaît aucun service : il reçoit
des entrées, rend un résultat. Les moteurs de référence sont `engines/patterning` (patronage) et
`engines/manufacturing` (fabrication) en Python ; `engines/drape` (drapé) est en TypeScript (ADR 0013). Depuis
l'[ADR 0021](../adr/0021-studio-local-et-refonte-des-moteurs.md), les moteurs de la boucle d'édition sont en
TypeScript (`engines/drafting`, `engines/cutting`, `engines/flats`, sur le modèle de `engines/drape` et
`engines/mannequin`) ; les deux moteurs Python sont gelés jusqu'à leur retrait.

```text
engines/patterning/
├─ AGENTS.md, Dockerfile, .importlinter
├─ src/patterning/
│  ├─ core/          calcul pur : géométrie, tracés (aucune entrée-sortie)
│  ├─ spec/          conversions entre les contrats (GarmentSpec) et les objets du cœur
│  ├─ api/           FastAPI : points d'entrée synchrones
│  └─ main.py        assemblage (engine-kit : santé, erreurs RFC 9457, journaux)
└─ tests/            unit/, property/, golden/, api/
```

- **Déterministe** : mêmes entrées, même version, résultat identique octet pour octet. Pas d'horloge ni de
  hasard dans `core/` ; les coordonnées sont arrondies à 0,01 mm en sortie.
- **Versionné** : chaque résultat porte la version du moteur (`ENGINE_VERSION`), qui entre dans l'empreinte ;
  changer un calcul, c'est changer de version.
- **Unités** : millimètres partout dans le cœur et dans le code métier ; aucun code en centimètres. Le moteur
  de patronage est réécrit en Python pur (ADR 0010) sans dépendance à GarmentCode, donc pas d'adaptateur
  centimètres ↔ mm. Les conversions depuis le navigateur (MakeHuman) restent dans `engines/mannequin/spec/`.
- **Frontières** : import-linter vérifie que `core/` n'importe ni FastAPI, ni Pydantic, ni les contrats, et que
  les couches ne remontent pas.
- **GPU isolé** : le code GPU (drapé, rendu) passe par une interface avec une version CPU plus lente, utilisée
  par les tests et les postes sans GPU.
- **Mannequin** : mêmes règles en TypeScript ; le cœur tourne à l'identique dans le navigateur et dans Node.
  Il est repris du prototype, découpé en modules testés ([ADR 0004](../adr/0004-reprise-moteur-mannequin.md)).
- **IA** _(à venir)_ : consignes versionnées dans `prompts/`, réponses validées par le schéma du contrat, jeu
  d'évaluation à chaque changement ; l'IA propose, un service enregistre après accord humain.

## Tests propres aux moteurs

- **Référence (golden)** : des modèles de référence et leurs sorties attendues. Toute différence fait échouer
  le test ; mettre à jour une référence (`UPDATE_GOLDEN=1`) demande l'accord d'un modéliste, jamais la seule
  décision d'un agent.
- **Propriétés** (Hypothesis) sur des mesures tirées au hasard dans les bornes plausibles : contours fermés,
  deux bords cousus ensemble de même longueur, sortie conforme au contrat.
- **Budget de temps** _(à venir)_ : un test échoue si le patronage d'un modèle de référence dépasse le temps
  visé (moins d'une seconde).

## Moteurs TypeScript du studio

- **Cœur pur** : ni DOM ni `node:*` dans le cœur ; deux entrées minces, `worker.ts` pour le navigateur et `node.ts`
  pour le serveur, qui rendent le même résultat octet pour octet.
- **Budget en test** : chaque moteur a un test de temps sur ses références (tracé et opérations moins de 10 ms,
  dessin moins de 4 ms, première image 3D moins de 1 s) ; dépasser fait échouer `pnpm check`.
- **FreeSewing** ([ADR 0019](../adr/0019-trace-freesewing.md)) : seul l'adaptateur de `engines/drafting` l'importe ;
  version épinglée, tracé en métrique, sorties arrondies à 0,001 mm ; une fiche de couture par modèle, testée sur
  5 tailles et aux bornes des options ; l'embu se déclare dans la fiche.
- **Opérations** ([ADR 0020](../adr/0020-document-de-modele-et-operations.md)) : aucune ne lit un nom de vêtement
  (règle de lint) ; chacune a son schéma dans `contracts/` et des tests de propriétés sur des compositions tirées au
  hasard (coutures appariées, contours simples, régions couvrantes).
- **Références golden** : les sorties de `drafting`, `cutting` et `flats` (GarmentSpec, SVG, DXF) ont leurs
  références ; même règle qu'ailleurs, un modéliste valide toute mise à jour.
