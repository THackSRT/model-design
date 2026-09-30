# 0003 — Pile technique et outillage

**Contexte.** Choix justifiés dans l'architecture (section 12), revus après vérification des licences en
septembre 2026.

**Décision.**

- TypeScript strict pour les applications, les services (NestJS, limité aux adaptateurs) et le moteur mannequin ;
  Python 3.12 pour les moteurs de calcul (FastAPI, Pydantic).
- PostgreSQL (Drizzle ORM, migrations SQL versionnées, sécurité au niveau des lignes), outbox pour les
  événements, NATS JetStream pour le bus et les files de tâches, Valkey pour le cache (et non Redis, dont
  les versions 8 sont sous RSAL, SSPL ou AGPL), stockage compatible S3 (SeaweedFS en local : MinIO ne publie plus
  d'images depuis octobre 2025).
- Kubernetes managé et Istio en mode ambient (Linkerd écarté : versions stables payantes au-delà de 50 employés).
- Outillage : pnpm + Nx, uv, ESLint + typescript-eslint, Prettier, Ruff, mypy strict, import-linter,
  Vitest, pytest + Hypothesis, Testing Library, Style Dictionary (jetons), PGlite pour les tests PostgreSQL.

**Conséquences.** Deux langages seulement. Les tests d'intégration PostgreSQL tournent sans Docker (PGlite) ;
les tests contre NATS arriveront avec le relais de l'outbox (phase 1).
