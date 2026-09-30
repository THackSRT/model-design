# 11. Observabilité, performance et qualité

Chaque requête et chaque tâche porte un identifiant de trace qui suit son parcours de l'application jusqu'au moteur GPU ; les objectifs ci-dessous sont des cibles de départ à ajuster après le pilote.

| Indicateur                                     | Objectif de départ               |
| ---------------------------------------------- | -------------------------------- |
| Disponibilité des services métier              | 99,5 % par mois                  |
| Temps de réponse API (95 % des requêtes)       | < 300 ms                         |
| Mannequin ou patron recalculé après un curseur | < 1 s                            |
| Drapé 3D d'un modèle simple                    | < 30 s, attente en file comprise |
| Notification après changement d'étape          | < 1 min                          |
| Écart du mannequin sur les tours mesurés       | < 6 mm                           |

- **Observabilité** : journaux structurés, métriques et traces (OpenTelemetry), tableaux de bord par service et par file, alertes sur les files qui s'allongent et les paiements en échec.
- **Tests des moteurs** : jeux de corps de référence et de modèles de référence ; chaque version est comparée à la précédente (longueurs de couture, surfaces, métrage, écarts du mannequin).
- **Tests de contrat** : schémas des API et des événements vérifiés à chaque déploiement.
- **Qualité métier** : toile d'essai des patrons de base par un modéliste ; retour des essayages enregistré pour corriger les aisances par morphologie.
- **Coûts** : suivi du coût GPU par drapé et par appel d'IA ; cache par empreinte pour ne jamais recalculer deux fois la même chose.
