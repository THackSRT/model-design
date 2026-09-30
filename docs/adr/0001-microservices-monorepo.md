# 0001 — Microservices dès le départ, dans un seul dépôt

**Contexte.** La plateforme réunit seize contextes métier et sept moteurs (architecture, sections 4 et 5).
Le fondateur a choisi les microservices dès le départ plutôt qu'un monolithe modulaire. L'équipe est petite
et une partie du code sera écrite par des agents.

**Décision.** Chaque service et chaque moteur est un déployable indépendant (image, base, cycle de livraison),
mais tout vit dans un seul dépôt : pnpm + Nx pour TypeScript, uv pour Python. Les frontières sont vérifiées
par les étiquettes Nx (`@nx/enforce-module-boundaries`) et par import-linter côté Python.

**Conséquences.** Plus d'infrastructure dès le départ (Kubernetes, maillage, bus). Le coût est limité par un
gabarit commun (`pnpm gen service|engine`), un socle partagé (`service-kit`, `engine-kit`) et la construction
des seuls projets touchés (`nx affected`). Un agent voit contrats, producteurs et consommateurs au même endroit.
