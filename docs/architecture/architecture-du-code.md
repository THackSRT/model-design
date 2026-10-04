# 13. Architecture du code

Les seize services et les sept moteurs sont déployés séparément, mais construits sur un même gabarit, pour que le code reste réutilisable, lisible et facile à étendre par des humains comme par des agents. Les règles détaillées sont dans [Directives de codage](../directives/index.md).

- **Un dépôt, des déploiements indépendants** : Nx construit et teste les seuls projets touchés, et refuse qu'un service importe le code d'un autre.
- **Clean architecture dans chaque service** : domaine pur au centre, cas d'usage et ports autour, adaptateurs (HTTP, NATS, PostgreSQL, moteurs) à l'extérieur ; remplacer une technologie ne touche qu'un adaptateur.
- **Contrat d'abord** : OpenAPI, AsyncAPI et JSON Schema dans `contracts/` ; types, validateurs et clients générés pour TypeScript et Python.
- **Front découplé du design** : jetons de design, composants, puis vues ; les modèles de vue (données, état, actions) sont partagés entre web et mobile et ne changent pas lors d'un redesign.
- **Studio local** ([ADR 0021](../adr/0021-studio-local-et-refonte-des-moteurs.md), [ADR 0022](../adr/0022-interface-du-studio-v2.md)) : le studio garde les quatre couches du front ; le magasin du document et le bus de commandes vivent dans `packages/features`, le calcul dans des Workers qui chargent les moteurs TypeScript (`engines/drafting`, `engines/cutting`, `engines/flats`, `engines/mannequin`, `engines/drape`), les mêmes que `designs` exécute sous Node.
- **Prêt pour les agents** : un `AGENTS.md` par projet, des générateurs pour toute structure nouvelle, une commande de vérification unique, des frontières et des interdits vérifiés par l'intégration continue.

Ce choix coûte plus d'infrastructure dès le départ (Kubernetes, bus, vingt-trois déploiements) ; le gabarit commun, les générateurs et le déploiement des seuls projets touchés le compensent.
