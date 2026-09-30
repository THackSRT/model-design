# Rédiger la documentation

La documentation avance avec le code : **une demande de fusion qui change un comportement met à jour la page qui
le décrit**, dans le même commit. Le site se construit en local (`pnpm docs:serve`), et `pnpm check` refuse un
lien cassé.

## Où écrire quoi

| Changement                                     | Page à mettre à jour                                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nouveau service, moteur ou application         | Sa page dans [Composants](../composants/index.md) (qui affiche son `AGENTS.md`) et le tableau d'état de l'[architecture](../architecture/index.md) |
| Décision d'architecture, dépendance, exception | Une nouvelle [ADR](../adr/index.md), puis la page d'architecture ou de directives concernée                                                        |
| Nouveau terme métier                           | [Langage commun](../directives/langage-commun.md)                                                                                                  |
| Nouvelle règle de code vérifiée par un outil   | La page de directives concernée                                                                                                                    |
| Étape franchie, livraison visible              | [Changelog](../suivi/changelog.md) (fichier `CHANGELOG.md`) et [tableau des travaux](../suivi/travaux.md)                                          |
| Changement de la pile locale                   | [Conteneurs Docker](conteneurs.md) et [Installation](installation.md)                                                                              |

## Rédaction progressive

- Une section décidée mais pas encore construite reste dans la page, marquée _(à venir)_. La marque disparaît
  dans le commit qui livre le code.
- Une page encore vide commence par un encadré `!!! note "À rédiger"` qui dit ce qu'elle contiendra et quand.
- L'architecture décrit la cible ; le tableau « Dans le code » de sa page d'accueil dit ce qui existe. Il est mis
  à jour à chaque étape.
- Le `CHANGELOG.md` garde une ligne par changement visible sous « Non publié » ; la section est datée et
  numérotée à chaque livraison. Le [tableau des travaux](../suivi/travaux.md) passe la ligne concernée à ✅.

## Style

- La première phrase d'une page ou d'une section dit l'essentiel.
- Des phrases courtes, des mots simples, des tableaux pour comparer, des listes pour les éléments parallèles.
- Les noms de fichiers, commandes et identifiants entre accents graves (`pnpm check`).
- Les schémas sont des images dans `docs/assets/diagrams/`, avec un texte alternatif qui dit ce qu'ils montrent.
- Pas de contenu dupliqué : on inclut un fichier du dépôt (`--8<-- "chemin"`) plutôt que de le recopier.
