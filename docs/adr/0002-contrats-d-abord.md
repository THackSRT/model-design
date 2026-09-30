# 0002 — Contrats d'abord

**Contexte.** Services TypeScript, moteurs Python et applications doivent parler le même langage, et un
changement d'un côté ne doit pas casser l'autre en silence.

**Décision.**

- Les corps de requête, de réponse et d'événement sont des **JSON Schema 2020-12** dans `contracts/schemas/`.
- Les routes HTTP sont décrites en **OpenAPI 3.1** (`contracts/openapi/`), qui référence ces schémas ;
  les événements en **AsyncAPI 3** (`contracts/asyncapi/events.yaml`), dans une enveloppe CloudEvents 1.0.
- `pnpm contracts:gen` génère les types TypeScript (`packages/contracts-ts`) et les modèles Pydantic
  (`py/contracts`). `pnpm contracts:check` (dans `pnpm check` et la CI) refuse un code généré périmé.
- La validation à l'exécution utilise les mêmes schémas (Ajv côté services, Pydantic côté moteurs,
  bornes lues dans les schémas côté front).

**Conséquences.** Les types OpenAPI générés par `openapi-typescript` rendent mal les schémas externes
(`$defs`, tuples) : on utilise les types issus des JSON Schema pour les corps, et le client HTTP du front est
écrit à la main sur ces types (`packages/features/src/api`). À revoir si l'outil corrige ce point.
