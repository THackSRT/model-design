# Moteur __name__ (TypeScript)

Rôle : (une phrase). Entrées : (type). Sorties : (type). Temps visé : (…).
Décision : ADR 0021 (le studio calcule dans le navigateur : moteur en TypeScript, cœur pur, une entrée navigateur ou
Worker et une entrée Node). Modèle à suivre : `engines/drape`.

- `src/index.ts` : entrée `.`, compatible navigateur et Worker (aucun `node:*`, aucun DOM) ;
  `test/browser-entry.test.ts` le vérifie. `src/node.ts` : entrée `@atelier/__name__/node`, réservée à Node ; elle
  réexporte `.` et ajoute ce qui touche aux fichiers, au réseau ou aux processus.
- `src/core/` : calcul pur et déterministe (ni E/S, ni horloge, ni hasard, ni `node:*`, ni `adapters/` ou `output/` :
  vérifié par le lint). Longueurs en mm (suffixe `Mm`), conversions aux frontières seulement.
  `core/example.ts` et `test/example.test.ts` sont des exemples : les remplacer par le premier vrai module.
- `src/version.ts` : `ENGINE_VERSION`. Changer un calcul, c'est changer `ENGINE_VERSION` (elle entre dans l'empreinte
  des résultats).
- Tests : `test/` (Vitest : unitaires, propriétés sur des mesures plausibles, références golden). Une référence golden
  ne se met à jour que sur instruction explicite.
- Commandes : `pnpm nx run @atelier/__name__:lint`, `…:typecheck`, `…:test`, `…:build`.
