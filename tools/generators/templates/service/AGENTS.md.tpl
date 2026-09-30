# Service __name__

Rôle : (une phrase). Données possédées : (tables). Événements publiés : (…). Événements consommés : (…).

- Couches : `src/domain` (ne dépend de rien), `src/application` (cas d'usage + ports),
  `src/adapters` (HTTP, persistance, clients), `src/composition.ts` (câblage), `src/main.ts`.
- Contrat : `contracts/openapi/__name__.yaml` ; schémas des corps dans `contracts/schemas/`.
- Commandes : `pnpm nx run @atelier/__name__:test`, `…:lint`, `…:typecheck`.
- Modèle à suivre : `services/designs`.
