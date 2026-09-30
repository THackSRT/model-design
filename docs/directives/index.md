# Directives de codage

Ce document fixe **comment on écrit le code** de la plateforme, découpée en microservices : il s'adresse aux
développeurs et aux agents de codage, avec les mêmes règles pour les deux. Il complète
l'[architecture](../architecture/index.md), qui dit quoi construire. Chaque règle vérifiable est vérifiée par
un outil dans `pnpm check` : ce qui n'est vérifié par rien finit par être oublié, par un humain comme par un agent.

Le résumé opérationnel pour les agents est dans `AGENTS.md`, à la racine du dépôt
(voir [Contribuer](../demarrer/contribuer.md)). Les mentions _(à venir)_ signalent ce qui est décidé mais pas
encore en place dans le dépôt ; elles disparaissent quand le code arrive.

## 1. Les dix règles d'or

1. **Le domaine ne dépend de rien.** Le code métier n'importe ni framework, ni base de données, ni HTTP, ni bus ;
   ce sont les adaptateurs qui dépendent de lui.
2. **Un service, un contexte métier, une base.** Aucun service ne lit la base d'un autre ni n'importe son code ;
   ils échangent par API et par événements.
3. **Le contrat d'abord.** Toute API et tout événement est décrit dans `contracts/` avant d'être codé ; les types
   sont générés, jamais recopiés à la main.
4. **L'écran n'a pas de logique métier.** Un composant d'interface reçoit des données et renvoie des intentions ;
   changer le design ne touche ni les règles ni les appels d'API.
5. **Un même concept, un seul nom, une seule place.** Le [langage commun](langage-commun.md) fait foi, du contrat
   à la base et à l'écran.
6. **Les unités sont explicites.** Longueurs en millimètres, montants en plus petite unité de la devise, dates en
   UTC ; l'unité figure dans le nom quand le type ne la porte pas.
7. **Petit et lisible.** Un fichier fait une chose, une fonction tient sur un écran ; le code se lit sans
   commentaire, et les commentaires expliquent le pourquoi.
8. **Tout comportement est testé.** Une règle métier sans test n'existe pas ; un bogue corrigé laisse un test qui
   l'aurait vu.
9. **Une commande unique vérifie tout.** `pnpm check` (formatage, contrats, lint, frontières, types, tests) doit
   passer avant toute demande de fusion, humaine ou agent.
10. **Les décisions sont écrites.** Un choix d'architecture, une nouvelle dépendance ou une exception à ces règles
    passe par une [fiche de décision](../adr/index.md) dans `docs/adr/`.

## Sommaire

| Page                                               | Contenu                                               |
| -------------------------------------------------- | ----------------------------------------------------- |
| [2. Langage commun](langage-commun.md)             | Glossaire métier ↔ code, unités                       |
| [3. Organisation du dépôt](depot.md)               | Monorepo, qui peut importer quoi, outils              |
| [4. Anatomie d'un microservice](microservice.md)   | Couches, règle de dépendance, exemple                 |
| [5. Contrats et communication](contrats.md)        | JSON Schema, OpenAPI, AsyncAPI, génération, versions  |
| [6. Moteurs de calcul](moteurs.md)                 | Cœur pur, adaptateurs, déterminisme                   |
| [7. Front-end adaptable](front-end.md)             | Jetons, composants, vues, modèles de vue              |
| [8. Conventions de code](conventions.md)           | Nommage, limites, erreurs, journaux                   |
| [9. Tests](tests.md)                               | Niveaux, outils, règles                               |
| [10. Développement avec des agents](agents.md)     | Contexte, tâches, interdits                           |
| [11. Revue et définition de « terminé »](revue.md) | Vérifications locales, CI, revue                      |
| [12. Sécurité et données sensibles](securite.md)   | Secrets, mensurations, dépendances                    |
| [13. Recettes](recettes.md)                        | Ajouter un service, un événement, un écran, un moteur |
