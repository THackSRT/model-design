# Conteneurs Docker

Chaque moteur, service et application a sa propre image, construite depuis la racine du dépôt ; un seul
`docker compose` fait tourner toute la plateforme sur un poste, sans service payant.

## Lancer toute la pile

```bash
pnpm stack:up     # construit les images puis démarre infrastructure, moteurs, services et studio
pnpm stack:down   # arrête tout (les données restent dans les volumes Docker)
pnpm dev:infra    # infrastructure seule, pour développer les services hors Docker
```

Puis ouvrir http://localhost:8080 : nginx sert le studio et joue la passerelle locale (`/api/designs/…` →
service `designs`).

| Conteneur       | Image                                 | Port local | Rôle                                                         |
| --------------- | ------------------------------------- | ---------- | ------------------------------------------------------------ |
| `studio`        | `atelier/studio` (nginx)              | 8080       | Studio web + passerelle locale                               |
| `designs`       | `atelier/designs` (Node 22)           | 3101       | Service des modèles et des patrons ; migrations au démarrage |
| `patterning`    | `atelier/patterning` (Python 3.12)    | 3201       | Moteur de patronage                                          |
| `manufacturing` | `atelier/manufacturing` (Python 3.12) | 3202       | Moteur de production (squelette)                             |
| `drape`         | `atelier/drape` (Node 22)             | 3203       | Moteur de drapé (XPBD, ENGINE_VERSION 0.5.0)                 |
| `postgres`      | `postgres:17`                         | 5432       | Bases des services                                           |
| `nats`          | `nats:2.11` (JetStream)               | 4222, 8222 | Bus d'événements et files de tâches                          |
| `valkey`        | `valkey/valkey:8`                     | 6379       | Cache                                                        |
| `s3`            | `chrislusf/seaweedfs`                 | 8333       | Stockage compatible S3 (MinIO ne publie plus d'images)       |

Les conteneurs de l'application sont dans le profil `app` de `platform/docker-compose.yml` ; sans ce profil,
seule l'infrastructure démarre.

## Comment les images sont construites

| Type          | Fichier                     | Construction                                                                   | Image finale                                                                              |
| ------------- | --------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Service Node  | `services/<nom>/Dockerfile` | `pnpm install`, build du service et de ses bibliothèques, `pnpm deploy --prod` | `node:22-slim`, `dist/` + migrations + dépendances de production, utilisateur `node`      |
| Moteur Python | `engines/<nom>/Dockerfile`  | `uv sync --frozen --no-dev --no-editable --package atelier-<nom>`              | `python:3.12-slim`, environnement virtuel seul (pas de code source), utilisateur `nobody` |
| Studio        | `apps/studio/Dockerfile`    | `vite build` du studio et de ses bibliothèques                                 | `nginx:alpine` + `nginx.conf` (passerelle locale)                                         |

Chaque image a une sonde de santé (`/health` pour les services et les moteurs). Les générateurs (`pnpm gen
service`, `pnpm gen engine`) créent le Dockerfile du nouveau projet ; il reste à l'ajouter au compose.

Construire une image seule :

```bash
docker build -f services/designs/Dockerfile -t atelier/designs .
```

## Variables d'environnement

Le service `designs` lit les modèles glTF des drapés dans le stockage S3 avec ces variables :

| Variable               | Exemple                       | Sens                     |
| ---------------------- | ----------------------------- | ------------------------ |
| `S3_ENDPOINT`          | aucun défaut                  | Adresse du serveur S3    |
| `S3_ACCESS_KEY_ID`     | Donné par l'administrateur S3 | Clé d'accès              |
| `S3_SECRET_ACCESS_KEY` | Donné par l'administrateur S3 | Clé secrète              |
| `S3_REGION`            | `us-east-1` (défaut)          | Région S3                |
| `S3_BUCKET`            | `drapes` (défaut)             | Nom du seau              |
| `S3_TIMEOUT_MS`        | `5000` (défaut)               | Délai avant abandon (ms) |

Sans point d'accès ni identifiants, le service démarre, journalise `s3-disabled` et répond 502 au téléchargement d'un modèle. La pile locale (`pnpm stack:up`) fournit ces valeurs (identité de développement de `platform/s3/s3-config.json`, point d'accès `http://s3:8333`) et crée le seau `drapes` au démarrage (service `s3-init`).

## Derrière un proxy d'entreprise

Si les téléchargements (npm, PyPI) passent par un proxy qui inspecte le TLS, donner son certificat d'autorité à
la construction ; il est monté le temps d'une étape et n'entre jamais dans l'image :

```bash
ATELIER_BUILD_CA=/chemin/ca.crt pnpm stack:up
docker build --secret id=ca,src=/chemin/ca.crt -f services/designs/Dockerfile -t atelier/designs .
```

## Limites

- Les images ne sont publiées nulle part : elles se construisent sur le poste ([ADR 0006](../adr/0006-local-d-abord.md)).
- Le service `designs` se connecte à PostgreSQL avec le compte propriétaire : la sécurité par lignes ne
  s'applique qu'avec un compte de service dédié, prévu pour l'hébergement.
- Pas encore de Helm ni de Kubernetes : ils arriveront avec un budget d'hébergement (architecture, section 8).
