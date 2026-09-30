# 0005 — Organisation fixe tant que le service Identité n'existe pas

**Contexte.** Toute donnée appartient à une organisation (architecture, section 10). Le service Identité et
l'échange de jetons arrivent en phase 2.

**Décision.** En phase 1, le service `designs` lit l'organisation dans sa configuration
(`DEV_ORGANIZATION_ID`), à travers le port `OrganizationContext`. Le domaine, les dépôts et la base filtrent
déjà par organisation.

**Conséquences.** Aucun déploiement public avant la phase 2. Le remplacement ne touche qu'un adaptateur : lire
l'organisation dans le jeton interne vérifié, jamais dans un en-tête libre.
