# 12. Sécurité et données sensibles

Les mensurations, les photos du corps, les téléphones et les paiements sont les données à protéger en priorité ;
le code les traite comme telles dès la première ligne, pas après un audit.

- **Secrets** : jamais dans le dépôt (`.env` est ignoré, seul `.env.example` est commité) ; lus au démarrage
  depuis l'environnement. Détecteur de secrets avant commit _(à venir)_.
- **Isolation** : chaque requête porte l'organisation de l'appelant ; les dépôts filtrent par organisation,
  doublés par la sécurité au niveau des lignes de PostgreSQL (`services/designs/migrations/0001_init.sql`).
  Chaque service teste qu'une organisation ne voit pas les données d'une autre.
- **Autorisations** : vérifiées dans le cas d'usage (qui a le droit de faire quoi est une règle métier), pas
  seulement à la passerelle. En phase 1, l'organisation est fixe ([ADR 0005](../adr/0005-organisation-de-developpement.md)).
- **Mensurations et photos** : chiffrées au repos, lues seulement par les services qui en ont besoin, chaque
  lecture tracée ; les photos du corps ne partent jamais vers un fournisseur d'IA externe.
- **Journaux, erreurs et événements** : identifiants seulement ; une erreur imprévue renvoie un problème
  générique (`internal-error`), sans pile ni requête SQL.
- **Entrées** : tout ce qui entre (HTTP, événement, fichier, réponse d'IA) est validé par son schéma avant
  d'atteindre le domaine.
- **Conteneurs** : images minimales, processus non root (`node`, `nobody`), aucun secret dans les couches ; le
  certificat d'un proxy d'entreprise passe par un secret de construction.
- **Dépendances** : licences permissives uniquement ; mises à jour et analyse des vulnérabilités _(à venir)_.
