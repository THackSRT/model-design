# Plateforme

- `docker-compose.yml` : infrastructure locale (PostgreSQL, NATS JetStream, Valkey, stockage S3 SeaweedFS). `pnpm dev:infra`. À la création du volume PostgreSQL, `postgres/init-designs-app.sh` crée le rôle sans privilège `designs_app` (mot de passe de développement) que le service `designs` utilise ; les migrations tournent sous `atelier`, propriétaire des tables (`MIGRATION_DATABASE_URL`). Volume existant : `docker compose -f platform/docker-compose.yml down -v` (efface les données de développement).
- Stockage S3 local : `s3/s3-config.json` déclare l'identité de développement (une seule fois) ; le service `s3-init` crée le seau `drapes` de façon idempotente. `designs` et `drape` reçoivent les variables `S3_*` ; `drape` laisse 40 s à l'arrêt (`stop_grace_period`).
- Tous les ports publiés du compose sont liés à `127.0.0.1` (PostgreSQL, NATS, Valkey, S3, moteurs, services, studio, documentation) : rien n'est exposé sur le réseau.
- À venir (phase 2) : charts Helm par service, Terraform du cluster Kubernetes managé, Istio en mode
  ambient, passerelle d'API, observabilité (OpenTelemetry, Grafana, Sentry). Voir l'architecture, sections 8 et 10.
