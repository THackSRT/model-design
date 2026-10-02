# 0016 — Storybook et captures comparées : Vitest en mode navigateur, Chromium figé dans Docker

**Contexte.** Le travail 1.21, annoncé par les directives du front (« histoires Storybook et captures comparées »),
doit donner un catalogue des composants de `packages/ui-web`, puis des vues du studio, et attraper les
régressions visuelles. Les tests actuels (Testing Library dans jsdom) ne calculent ni CSS ni mise en page : un jeton
de couleur cassé ou un composant qui déborde passe inaperçu. Contraintes : tout en local et sans dépense (ADR 0006,
donc ni Chromatic, ni Percy, ni Argos en ligne), licences permises seulement (ADR 0008, 0009), `pnpm check` qui ne
s'alourdit pas, et des captures identiques d'un poste à l'autre. Or le rendu dépend du système : la police des jetons
(`--font-family: Inter, system-ui, sans-serif`) n'est pas embarquée, donc Segoe UI sous Windows et une police
DejaVu ou Liberation sous Linux, avec un lissage et un rendu GPU différents.

Constats sur le registre npm (`pnpm view`, 2 octobre 2026) :

| Paquet                       | Version | Licence    | Remarque                                                                                                                                                                                                   |
| ---------------------------- | ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storybook`                  | 10.6.1  | MIT        | 22,2 Mo décompressés ; dépendances MIT ou ISC (`esbuild`, `oxc-parser`, `oxc-resolver`, `recast`, `ws`, `open`, `semver`, `@testing-library/*`, `@vitest/expect`, `@webcontainer/env`, `@storybook/icons`) |
| `@storybook/react-vite`      | 10.6.1  | MIT        | pairs : Vite 5 à 8, React 16.8 à 19 ; dépendances MIT (`react-docgen`, `@storybook/builder-vite`, `@storybook/react`, `tsconfig-paths`, `resolve`, `magic-string`, `@rollup/pluginutils`)                  |
| `@storybook/addon-vitest`    | 10.6.1  | MIT        | pairs : Vitest 3 à 5, `@vitest/browser`, `@vitest/browser-playwright`                                                                                                                                      |
| `@storybook/test-runner`     | 0.26.0  | MIT        | tire Jest 30, Babel, SWC (`@swc/core`, Apache 2.0, binaire natif), `nyc` (ISC), `jest-process-manager`, `expect-playwright` ; exige un Storybook servi                                                     |
| `@vitest/browser`            | 5.0.3   | MIT        | `toMatchScreenshot` intégré ; dépendances MIT (`pngjs`, `@blazediff/core`, `@vitest/ui`, `sirv`, `ws`)                                                                                                     |
| `@vitest/browser-playwright` | 5.0.3   | MIT        | pair : `playwright` ; option `connectOptions.wsEndpoint` (navigateur distant) vérifiée dans ses types                                                                                                      |
| `playwright`, `-core`        | 1.63.0  | Apache 2.0 | aucun téléchargement à l'installation : les navigateurs se téléchargent à part (`playwright install`) ou viennent d'une image                                                                              |

Options comparées pour la comparaison d'images :

- **Test runner de Storybook avec captures Playwright** (et `jest-image-snapshot`) : un second exécuteur de tests
  (Jest à côté de Vitest), Babel et SWC natifs, un Storybook à construire et servir avant chaque passe. Lent et
  lourd ; pour les projets Vite, Storybook recommande lui-même le module Vitest. Écarté.
- **Playwright Test et `toHaveScreenshot` sur le Storybook construit** : comparateur mûr, mais `storybook build`
  et un serveur à chaque passe (de 30 à 60 s), pour ce que Vitest fait sans construction. Écarté, solution de repli.
- **Vitest en mode navigateur et `toMatchScreenshot`** sur les histoires composées (`composeStories`) : même
  exécuteur, même configuration Vite que les tests actuels, pas de construction ni de serveur, mise en cache par Nx.
  Retenu.
- **Services en ligne** (Chromatic, Percy, Argos) : comptes et quotas, contraires à l'ADR 0006. Écartés.

Pour la stabilité entre postes, le navigateur doit être le même partout : l'image officielle
`mcr.microsoft.com/playwright:v1.63.0-noble` (Ubuntu, navigateurs et polices figés par la version) lance un serveur
Playwright ; Vitest, sur le poste (Windows ou Linux), s'y connecte par `connectOptions.wsEndpoint`. Le chemin par
défaut des références (`<nom>-chromium-<plateforme>.png`) prend la plateforme du processus Node, pas celle du
navigateur : il faut le remplacer pour n'avoir qu'une référence par capture.

**Décision.**

- **Storybook 10 pour `packages/ui-web`** : `storybook`, `@storybook/react-vite` et `@storybook/react` (pour
  `composeStories`) en dépendances de développement du paquet, configuration dans `packages/ui-web/.storybook/`,
  une histoire `*.stories.tsx` à côté de chaque composant, un état par histoire, données fictives seulement. Les
  jetons (`@atelier/design-tokens`) et `ui.css` sont chargés par `preview.tsx`. Cibles Nx `storybook` (serveur sur
  `127.0.0.1:6006`) et `build-storybook` (sortie `storybook-static/`, ignorée par git, jamais publiée).
- **Confidentialité** : télémétrie de Storybook coupée (`core.disableTelemetry: true` et
  `STORYBOOK_DISABLE_TELEMETRY=1` dans les scripts), rapports de plantage coupés, pas de recherche de mise à jour
  (`--no-version-updates`), serveur sur la boucle locale seulement.
- **Les histoires sont des tests dans `pnpm check`** : un test jsdom de la cible `test` compose toutes les
  histoires du paquet et rend chacune avec Testing Library (rendu sans erreur, fonction `play` éventuelle
  exécutée). Aucun navigateur dans `pnpm check`.
- **Captures comparées par Vitest en mode navigateur** : `@vitest/browser-playwright` (et `@vitest/browser`, qu'il
  tire) et `playwright`, en version exacte identique à celle de l'image ; configuration séparée
  `vitest.visual.config.ts`, fichier `src/visual.test.tsx` qui capture chaque histoire composée
  (`expect.element(…).toMatchScreenshot()`), fenêtre fixe, facteur d'échelle 1, animations coupées, curseur de
  saisie masqué. Références PNG versionnées dans `__screenshots__/`, sans suffixe de plateforme
  (`resolveScreenshotPath` remplacé), relues dans la demande de fusion comme du code.
- **Navigateur : Chromium de l'image Playwright, figée par sa version**, servi par un service `playwright` de
  `platform/docker-compose.yml` (profil `visual`, port publié sur `127.0.0.1` seulement) ; Vitest s'y connecte avec
  `exposeNetwork: '<loopback>'` pour que le navigateur atteigne le serveur de test du poste. Commandes racine :
  `pnpm visual:browser` (démarre le service), `pnpm visual` (cibles `visual` de tous les projets),
  `pnpm visual -- --update` (régénère les références, volontairement).
- **Cible Nx `visual`, hors de `pnpm check` et du hook `pre-push`** : elle exige Docker. Mise en cache (entrées :
  sources du projet, histoires, jetons, références). Elle se lance avant toute demande de fusion qui touche
  `packages/ui-web`, `packages/design-tokens` ou les vues du studio.
- **Vues du studio ensuite** : les `view.tsx` (sans logique, par règle) reçoivent leurs histoires et leurs
  captures avec la même configuration, dans `apps/studio/.storybook/`. Le canevas WebGL du mannequin est exclu des
  captures (rendu GPU non reproductible) : il est remplacé par un emplacement réservé dans les histoires.
- **Non retenus pour l'instant** : `@storybook/addon-vitest` (panneau de tests dans l'interface de Storybook) et
  `eslint-plugin-storybook`. Les ajouter demande une nouvelle ADR.

**Conséquences.** Environ 25 Mo de dépendances de développement, sous licences MIT, ISC et Apache 2.0, et une
image Docker lourde (de l'ordre du gigaoctet) téléchargée une fois par poste. Les captures demandent Docker, déjà
nécessaire pour la pile (`pnpm stack:up`) ; un poste sans Docker garde les histoires vérifiées dans `pnpm check`.
Les captures n'étant pas dans le hook, l'orchestrateur les lance dans la livraison (skill `/livrer`) quand le front
change, et le relecteur demande le résultat. Une montée de version de `playwright` change l'image, donc le rendu :
elle se fait dans une demande de fusion dédiée qui régénère toutes les références. Le poids des références reste
modeste (de 10 à 30 ko par capture). Les captures montrent la police de repli de l'image, pas Inter. L'image Playwright et ses polices sont un outil, ni lié ni redistribué (même raisonnement que l'ADR 0017 pour Chromium). À revoir si
une application mobile (Expo) demande ses propres captures, ou si une police est embarquée.

**Décisions de l'orchestrateur, sur délégation de l'utilisateur (02/10/2026).** Vitest en mode navigateur et
`toMatchScreenshot` sont retenus contre le test runner de Storybook (Jest, Babel et SWC en double) et contre
Playwright Test sur le Storybook construit (construction à chaque passe). Chromium seul, de l'image officielle
Playwright figée par sa version, piloté à distance : une seule référence par capture, la même sous Windows et sous
Linux. Captures hors de `pnpm check` et du hook `pre-push` (Docker requis) ; les histoires, elles, sont vérifiées
dans `pnpm check` par un rendu jsdom. Storybook d'abord dans `packages/ui-web`, puis les vues du studio ; module
Vitest de Storybook et règles de lint de Storybook non retenus. Télémétrie coupée. Découpage en quatre tâches
(1.21a à 1.21d).

**À décider par l'utilisateur.** Embarquer la police Inter (licence SIL OFL 1.1, hors de la liste des licences
permises) pour que le studio et les captures l'affichent sur tous les postes. D'ici là, les jetons gardent
`Inter, system-ui, sans-serif` et les captures utilisent la police de repli de l'image.
