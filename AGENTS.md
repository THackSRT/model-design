# AGENTS.md — règles pour les agents de codage (et les humains)

Plateforme de confection sur mesure : du modèle au vêtement livré, pour clients, stylistes, ateliers,
vendeurs de tissus et prestataires. Microservices dans un seul dépôt (monorepo), déployés séparément.

Lisez ce fichier, puis le `AGENTS.md` du projet que vous modifiez. Les règles complètes sont dans les
**Directives de codage** ; l'architecture dans le **document d'architecture** ; les deux sont dans la documentation du dépôt
(`docs/`, site MkDocs : `pnpm docs:serve`). Avec Claude Code, `CLAUDE.md` et `.claude/` ajoutent la répartition
des tâches entre sous-agents (`docs/demarrer/orchestration.md`).

## Carte du dépôt

| Dossier      | Contenu                                                                                                                | Modèle à suivre       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `contracts/` | Source de vérité des échanges : JSON Schema, OpenAPI, AsyncAPI                                                         | `contracts/README.md` |
| `apps/`      | Applications (studio web ; mobile à venir)                                                                             | `apps/studio`         |
| `services/`  | Microservices TypeScript (NestJS), un contexte métier chacun                                                           | `services/designs`    |
| `engines/`   | Moteurs de calcul : Python (patronage, production) et TypeScript (mannequin, drapé)                                    | `engines/patterning`  |
| `packages/`  | Bibliothèques TS : `kernel`, `contracts-ts` (généré), `service-kit`, `design-tokens`, `ui-web`, `features`, `viewer3d` | —                     |
| `py/`        | Bibliothèques Python : `contracts` (généré), `engine-kit`                                                              | —                     |
| `tools/`     | Générateurs (`tools/generators`) et génération des contrats (`tools/contracts`)                                        | —                     |
| `platform/`  | Infrastructure locale (`docker-compose.yml`)                                                                           | —                     |
| `docs/`      | ADR, glossaire, plan de la phase 1                                                                                     | —                     |
| `prototype/` | Ancien prototype statique, **figé** : référence seulement, ne pas modifier                                             | —                     |

## Commandes

```bash
pnpm run setup             # pnpm install + uv sync --all-packages --all-groups (`pnpm setup` seul est une commande de pnpm)
pnpm check                 # contrats à jour + lint + types + tests de tous les projets (obligatoire avant de rendre la main)
pnpm check:affected        # idem, seulement les projets touchés depuis main
pnpm contracts:gen         # régénère les types TS et les modèles Python après une modification de contracts/
pnpm gen service <nom>     # nouveau microservice (aussi : engine <nom>, event <entité>.<verbe>, screen <app> <écran>)
pnpm nx run <projet>:test  # un seul projet (noms : `pnpm nx show projects`)
pnpm dev:infra             # infrastructure locale dans Docker (PostgreSQL, NATS, Valkey, stockage S3)
pnpm stack:up              # toute la plateforme dans Docker, studio sur http://localhost:8080
pnpm docs:serve            # documentation MkDocs en local (http://127.0.0.1:8000)
```

Lancer la tranche phase 1 en local (trois terminaux) :

```bash
pnpm nx run patterning:dev                                          # moteur de patronage, port 3201
pnpm nx run @atelier/designs:build && pnpm --filter @atelier/designs start   # service designs, port 3101
pnpm nx run @atelier/studio:dev                                     # studio, http://localhost:5173
```

## Règles d'or

1. **Le domaine ne dépend de rien.** `services/*/src/domain` n'importe que `@atelier/kernel` et des _types_ de
   `@atelier/contracts-ts`. Frameworks, SQL, HTTP et NATS vivent dans `adapters/`.
2. **Un service, un contexte, une base.** Jamais d'import d'un autre service, jamais de lecture de sa base.
3. **Le contrat d'abord** : modifier `contracts/`, lancer `pnpm contracts:gen`, puis coder. Le code généré
   (`**/generated/**`) ne se modifie jamais à la main.
4. **L'écran n'a pas de logique métier** : `packages/features` (modèle de vue) → `screen.tsx` → `view.tsx`.
   Aucune couleur ni taille en dur : jetons de `@atelier/design-tokens`.
5. **Un concept, un nom** : voir `docs/directives/langage-commun.md`. Code en anglais, interface en français (clés de traduction).
6. **Unités explicites** : longueurs en mm (suffixe `Mm`), montants en plus petite unité + devise, dates UTC.
7. **Petit et lisible** : 300 lignes par fichier, 40 par fonction, 4 paramètres, complexité 10 (vérifié par le lint).
8. **Tout comportement est testé** ; un bogue corrigé laisse un test qui l'aurait vu.
9. **`pnpm check` doit passer** avant toute demande de fusion.
10. **Les décisions sont écrites** : nouvelle dépendance ou exception → une ADR dans `docs/adr/`.

## Façon de travailler

1. Lire ce fichier et le `AGENTS.md` du projet.
2. Toute structure nouvelle vient d'un générateur (`pnpm gen …`), jamais à la main.
3. Ordre : contrat → `pnpm contracts:gen` → tests qui échouent → code → tests qui passent.
4. Rester dans le périmètre de la tâche ; un besoin ailleurs se signale, il ne se code pas en passant.
5. Petites demandes de fusion (un sujet, ~400 lignes hors code généré), Conventional Commits avec le projet en
   portée : `feat(designs): …`.

## Interdits

- Modifier du code généré ou une référence golden (`engines/*/tests/golden`) sans instruction explicite.
- Désactiver ou affaiblir un test ou une règle (`eslint-disable`, `# type: ignore`, `.skip`) sans ADR.
- Importer le code d'un autre service, lire sa base, modifier ses migrations.
- Ajouter une dépendance sans ADR ; licences permises : MIT, Apache 2.0, BSD, ISC, CC0, Unlicense (ADR 0008), PSF-2.0 (ADR 0009).
- Écrire un secret, une donnée réelle de client ou une mesure réelle dans le code, les tests ou les journaux.
- Modifier `prototype/`.

## Terminé, c'est

- [ ] `pnpm check` passe (le hook `pre-push` lance `pnpm check:affected` ; tout tourne en local, ADR 0006).
- [ ] Contrats et code généré à jour.
- [ ] Un test par comportement nouveau ou corrigé.
- [ ] Textes de l'interface en clés de traduction.
- [ ] `AGENTS.md` du projet, langage commun, ADR et pages de `docs/` à jour si besoin.
- [ ] Ligne ajoutée au `CHANGELOG.md` (section « Non publié ») et statut mis à jour dans
      `docs/suivi/travaux.md` pour un changement visible.
