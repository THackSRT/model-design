# Plateforme

- `docker-compose.yml` : infrastructure locale (PostgreSQL, NATS JetStream, Valkey, MinIO). `pnpm dev:infra`.
- À venir (phase 2) : charts Helm par service, Terraform du cluster Kubernetes managé, Istio en mode
  ambient, passerelle d'API, observabilité (OpenTelemetry, Grafana, Sentry). Voir l'architecture, sections 8 et 10.
