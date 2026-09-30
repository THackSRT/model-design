# 8. Infrastructure et déploiement

Tout tourne dans des conteneurs sur un cloud unique, avec un pool CPU permanent et un pool GPU qui s'allume à la demande ; seuls les moteurs de drapé, de rendu réaliste et d'IA auto-hébergée ont besoin de GPU.

!!! info "Aujourd'hui : tout en local, sans dépense"
Tant que le projet n'a pas de budget d'hébergement, toute la plateforme tourne sur un poste avec
`docker compose` (voir [Conteneurs Docker](../demarrer/conteneurs.md) et l'[ADR 0006](../adr/0006-local-d-abord.md)).
Le tableau ci-dessous décrit la cible de production.

| Couche          | Choix                                                                                                                             | Remarque                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Entrée          | CDN + pare-feu applicatif + passerelle d'API                                                                                      | Latence réduite en Afrique de l'Ouest (point de présence proche : Lagos, Johannesburg ou Europe du Sud) |
| Services métier | Conteneurs orchestrés par Kubernetes managé : un déploiement, une image et une base par service, politiques réseau entre services | Mise à l'échelle horizontale                                                                            |
| Moteurs CPU     | Pool de workers Python et Node                                                                                                    | Patronage, production, imbrication                                                                      |
| Moteurs GPU     | Pool de workers GPU mis à l'échelle selon la file, arrêt quand elle est vide                                                      | Drapé, rendus, IA ; coût maîtrisé par le cache                                                          |
| Données         | PostgreSQL managé (réplique + sauvegardes point-in-time), Valkey, stockage objet                                                  | Chiffrement au repos                                                                                    |
| Bus et file     | NATS JetStream (ou Kafka managé)                                                                                                  | Rejeu des événements possible                                                                           |
| Environnements  | développement, recette, production                                                                                                | Déploiement continu, migrations de base versionnées                                                     |

**Hors-ligne et réseau faible**

- L'application mobile garde en local les commandes, tâches et fiches clients de l'atelier ; les modifications sont rejouées à la reconnexion, avec règle de résolution des conflits par champ.
- Photos compressées côté téléphone, envoyées en arrière-plan, reprise après coupure.
- Le mannequin et le patron 2D se calculent dans l'application ; seul le drapé 3D exige le réseau.
- Mode données réduites : 2,5D au lieu de 3D, images basse définition.
