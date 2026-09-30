# 6. Moteurs de calcul

Un moteur est un cœur de calcul pur entouré d'adaptateurs minces : une API pour les appels rapides, un worker pour
les tâches de la file _(à venir)_. Il ne possède pas de base de données et ne connaît aucun service : il reçoit
des entrées, rend un résultat. Le moteur de référence est `engines/patterning`.

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
- **Unités** : millimètres partout dans le cœur ; les conversions (centimètres de GarmentCode ou de MakeHuman)
  restent dans `spec/` ou l'API du moteur.
- **Frontières** : import-linter vérifie que `core/` n'importe ni FastAPI, ni Pydantic, ni les contrats, et que
  les couches ne remontent pas.
- **GPU isolé** : le code GPU (drapé, rendu) passe par une interface avec une version CPU plus lente, utilisée
  par les tests et les postes sans GPU.
- **Mannequin** : mêmes règles en TypeScript ; le cœur tourne à l'identique dans le navigateur et dans Node.
  Il est repris du prototype et doit être découpé pendant la phase 1 ([ADR 0004](../adr/0004-reprise-moteur-mannequin.md)).
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
