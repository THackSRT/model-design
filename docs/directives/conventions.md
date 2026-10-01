# 8. Conventions de code

Le formatage est automatique (Prettier, Ruff) et ne se discute pas en revue ; les conventions ci-dessous sont
celles qu'un outil ne peut pas deviner, et les limites chiffrées sont vérifiées par le lint.

| Élément                    | Convention                                                        | Exemple                              |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| Fichiers et dossiers       | kebab-case, un concept par fichier                                | `create-design-version.ts`           |
| Types, classes, composants | PascalCase                                                        | `DesignVersion`, `PatternStudioView` |
| Fonctions et variables     | camelCase ; une fonction commence par un verbe                    | `createDesign`, `layoutPanels`       |
| Booléens                   | préfixe `is`, `has`, `can`                                        | `isPaid`, `hasDeposit`               |
| Constantes                 | UPPER_SNAKE_CASE                                                  | `DESIGN_NAME_MAX_LENGTH`             |
| Python                     | snake_case pour modules et fonctions, PascalCase pour les classes | `draft_straight_skirt()`             |
| Tables et colonnes SQL     | snake_case, tables au pluriel                                     | `design_versions.created_at`         |
| Tests                      | même nom que le fichier testé + `.test.ts`, ou `test_*.py`        | `ids.test.ts`                        |

| Limite (vérifiée par ESLint et Ruff) | Valeur                      |
| ------------------------------------ | --------------------------- |
| Lignes par fichier                   | 300                         |
| Lignes par fonction                  | 40 (hors tests)             |
| Paramètres par fonction              | 4 (au-delà, un objet nommé) |
| Complexité cyclomatique              | 10                          |
| Profondeur d'imbrication             | 3                           |

- **Types** : TypeScript strict (`noUncheckedIndexedAccess` compris), sans `any` (on reçoit `unknown` puis on
  valide), sans assertion non nulle `!` ; les `switch` sur une union sont exhaustifs (`assertNever`). Python
  annoté partout, vérifié par mypy strict.
- **Erreurs** : une erreur prévue par le métier est une valeur (`Result` de `@atelier/kernel`, avec un `kind`
  nommé) ; une exception signale un bogue ou une panne. On ne masque jamais une erreur, et la traduction en HTTP
  se fait au bord (`failWith`, `ProblemFilter`).
- **État** : pas d'état global modifiable ni de singleton en dehors de la racine de composition ; les fonctions
  pures sont la règle, les effets restent dans les adaptateurs.
- **Journaux** : JSON structuré (`createLogger` de `service-kit`, `configure_logging` d'`engine-kit`) avec un
  nom d'événement stable. Jamais de mesure corporelle, de téléphone, de photo ni de jeton dans un journal.
- **Configuration** : variables d'environnement validées par un schéma au démarrage (`loadConfig`) ; un service
  mal configuré refuse de démarrer, et le domaine ne lit jamais la configuration.
- **Commentaires** : ils disent pourquoi, pas quoi ; les exports publics des bibliothèques ont une TSDoc ou une
  docstring ; un `TODO` cite son ticket.
- **Dépendances** : une nouvelle bibliothèque passe par une ADR courte ; seules les licences permissives (MIT,
  Apache 2.0, BSD, ISC, CC0, Unlicense — ADR 0008, PSF-2.0 — ADR 0009) sont acceptées.
- **Commits** : Conventional Commits, avec le projet en portée (`feat(designs): liste des versions`).
