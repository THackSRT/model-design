# 0017 — Tests de bout en bout : Playwright Test sur la pile Docker, Chromium seul, hors de `pnpm check`

**Contexte.** Le travail 1.24 doit vérifier les parcours critiques de la phase 1 dans un vrai navigateur, sur la
plateforme entière : studio, `designs`, moteurs de patronage et de fabrication, base et bus. La pile tourne en local
par `pnpm stack:up` (ADR 0006) ; le studio est servi sur `http://localhost:8080`, et nginx y relaie l'API de
`designs` sous `/api/designs/` (santé : `/api/designs/health`). Les directives des tests prévoient Playwright.
Le hook `pre-push` lance `pnpm check:affected`, qui ne demande pas Docker ; les tests d'intégration qui exigent un
NATS sont déjà hors de `pnpm check` (ADR 0008). Construire et démarrer la pile prend plusieurs minutes la première
fois.

Constats (`pnpm view`, 2 octobre 2026) : `@playwright/test` 1.63.0, licence **Apache 2.0**, une seule dépendance,
`playwright` 1.63.0 (Apache 2.0), qui ne dépend que de `playwright-core` 1.63.0 (Apache 2.0) ; rien n'est téléchargé
à l'installation du paquet. Les navigateurs se téléchargent à part (`playwright install`), gratuitement, depuis le
réseau de diffusion de Playwright : Chromium (code de Chromium sous BSD-3-Clause, composants tiers sous leurs propres
licences), Firefox (MPL 2.0, hors liste) et WebKit (parties LGPL 2.1, hors liste). Cypress (MIT) ferait l'affaire
mais embarque Electron et pousse vers son service en ligne ; Playwright est déjà retenu pour les captures
(ADR 0016) : un seul outil de navigateur dans le dépôt.

**Décision.**

- **Projet `apps/studio-e2e`** (`@atelier/studio-e2e`, privé, étiquette Nx `type:e2e`), à part du studio : ses
  dépendances, son `tsconfig` (Node, pas le DOM de l'application) et sa cible ne touchent pas l'application. Il
  n'importe aucun code du studio ; seulement, au besoin, des _types_ de `@atelier/contracts-ts` et de
  `@atelier/kernel` (règle de frontières `type:e2e`). Créé à la main, par exception à la règle « toute structure nouvelle vient d'un générateur » : c'est le seul projet de ce genre ; un
  générateur viendra avec le deuxième (application mobile).
- **`@playwright/test` en version exacte, la même que `playwright` (ADR 0016)** : une seule version de Playwright
  dans le dépôt.
- **Cible Nx `e2e`, sans cache** (le résultat dépend de l'état de la pile), **hors de `pnpm check` et du hook
  `pre-push`** : sinon chaque envoi dépendrait de Docker et d'une pile construite. Le lint et le contrôle des types
  du projet restent dans `pnpm check`. Commandes racine : `pnpm e2e:install` (Chromium seul, sans interface :
  `playwright install --only-shell chromium`) et `pnpm e2e` (la pile doit tourner). Les tests de bout en bout se
  lancent avant toute demande de fusion qui touche le studio, `packages/features`, `designs`, les routes HTTP d'un
  moteur ou un contrat qu'ils échangent ; l'orchestrateur le fait dans la livraison (skill `/livrer`).
- **Chromium seul, sur le poste.** Firefox et WebKit ne sont pas installés (licences hors liste, pas de besoin en
  phase 1). Le navigateur est un outil téléchargé, ni lié ni redistribué avec la plateforme, comme les images
  Docker de la pile. Les tests vérifient des comportements, pas des pixels : pas de capture comparée ici (ADR 0016).
- **Configuration** (`playwright.config.ts`) : adresse `E2E_BASE_URL`, par défaut `http://localhost:8080` ; **toute
  adresse autre que `localhost` ou `127.0.0.1` est refusée**, car les tests écrivent des données. Une préparation
  globale vérifie le studio et `/api/designs/health` et échoue vite avec « lancez `pnpm stack:up` ». Deux
  processus, aucune nouvelle tentative (un test instable est un bogue), délai de 10 s par action et de 60 s par
  test, langue `fr-FR`, fuseau UTC. Traces et captures conservées seulement en cas d'échec, dans
  `apps/studio-e2e/test-results/` et `playwright-report/`, ignorés par git ; rapport HTML jamais ouvert
  automatiquement.
- **Sélecteurs** : par rôle et nom accessible, avec les textes français affichés (ce que voit l'utilisateur) ;
  `data-testid` seulement pour un élément sans rôle accessible (pièces SVG du patron).
- **Données fictives** : constructeurs dans `apps/studio-e2e/src/fixtures/`, mesures synthétiques (comme celles des
  tests du patronage : tour de taille 640 mm, de hanches 960 mm, longueur 600 mm) ; chaque test crée son propre
  modèle, au nom unique (`e2e-<scénario>-<horodatage UTC>`), dans l'organisation fixe de développement (ADR 0005).
  Aucun nettoyage : la base de la pile locale se remet à zéro avec ses volumes. Jamais de mesure réelle ni de
  secret.
- **Parcours minimaux de la phase 1** : calcul d'un patron (jupe droite : pièces affichées, version 1) ; export
  (SVG 1:1, PDF A4 tuilé, DXF-AAMA téléchargés : nom, type, premiers octets) ; onglet Tissus (banc d'essai affiché,
  saisie conservée d'un onglet à l'autre, rapport exporté puis réimporté) ; historique (deuxième version avec un
  paramètre changé : deux versions listées, la comparaison montre le paramètre). Le drapé suivra la tâche 1.19g.

**Conséquences.** Environ 15 Mo de paquets npm, et environ 100 Mo de Chromium sans interface par poste, dans le cache
de Playwright, hors du dépôt. Un parcours cassé entre deux services n'est vu que si quelqu'un lance `pnpm e2e` :
l'orchestrateur et le relecteur s'en chargent, et une tâche manuelle de l'intégration continue
(`workflow_dispatch`, ADR 0006) pourra le faire plus tard. Les textes français changés dans le studio demandent
parfois de changer un test. La règle de frontières `type:e2e` s'ajoute à `eslint.config.mjs`. À revoir quand
l'application mobile demandera ses propres parcours, ou quand l'intégration continue tournera sur chaque demande de
fusion.

**Décisions de l'orchestrateur, sur délégation de l'utilisateur (02/10/2026).** Playwright Test retenu
(Apache 2.0) ; projet `apps/studio-e2e` à part ; cible `e2e` hors de `pnpm check` et du hook `pre-push`, lancée à la
demande et dans la livraison ; Chromium sans interface seul, Firefox et WebKit exclus ; le navigateur téléchargé est
traité comme un outil, pas comme une dépendance du code ; tests limités à la pile locale (adresse vérifiée) ; quatre
parcours minimaux ; découpage en quatre tâches (1.24a à 1.24d). Rien n'est laissé à l'utilisateur : aucune licence
hors liste n'entre dans le dépôt, aucune dépense.
