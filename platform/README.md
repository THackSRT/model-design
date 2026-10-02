# Plateforme

- `docker-compose.yml` : infrastructure locale (PostgreSQL, NATS JetStream, Valkey, MinIO). `pnpm dev:infra`. À la création du volume PostgreSQL, `postgres/init-designs-app.sh` crée le rôle sans privilège `designs_app` (mot de passe de développement) que le service `designs` utilise ; les migrations tournent sous `atelier`, propriétaire des tables (`MIGRATION_DATABASE_URL`). Volume existant : `docker compose -f platform/docker-compose.yml down -v` (efface les données de développement).
- À venir (phase 2) : charts Helm par service, Terraform du cluster Kubernetes managé, Istio en mode
  ambient, passerelle d'API, observabilité (OpenTelemetry, Grafana, Sentry). Voir l'architecture, sections 8 et 10.
