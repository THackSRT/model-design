# Architecture du système

Ce document dit **quoi construire** : acteurs, services, moteurs, échanges, données, infrastructure et
étapes. Les [directives de codage](../directives/index.md) disent **comment l'écrire**. Il est rédigé au fil
du projet : chaque décision qui le modifie passe par une [fiche de décision](../adr/index.md), et la colonne
« Dans le code » ci-dessous suit ce qui existe réellement dans le dépôt.

| Section                                                             | Contenu                                   | Dans le code                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [1. Objet, périmètre et principes](#1-objet-perimetre-et-principes) | Ce que couvre la plateforme               | Référence                                                                                                                        |
| [2. Diagramme global](vue-globale.md)                               | Couches, services, moteurs, studio local  | Tranche phase 1 : studio, `designs`, `patterning`, mannequin ; cible : studio local (2.1)                                        |
| [3. Acteurs et applications](acteurs.md)                            | Rôles, applications, boucle de la filière | Studio web (phase 1)                                                                                                             |
| [4. Services métier](services.md)                                   | Les seize services                        | `designs` (service de référence)                                                                                                 |
| [5. Les moteurs](moteurs.md)                                        | Les sept moteurs                          | `mannequin`, `drape` (0.12.0) ; `patterning` et `manufacturing` en retrait ; à venir : `drafting`, `cutting`, `flats` (ADR 0021) |
| [6. Communications](communications.md)                              | Modes d'échange, séquences                | HTTP + outbox + NATS JetStream                                                                                                   |
| [7. Données, stockage et formats](donnees.md)                       | Modèle conceptuel, entités, normes        | Tables de `designs`, format pivot `GarmentSpec`                                                                                  |
| [8. Infrastructure](infrastructure.md)                              | Conteneurs, environnements                | Images Docker et `docker compose` locaux                                                                                         |
| [9. Sécurité et licences](securite.md)                              | Données sensibles, licences               | Isolation par organisation (ADR 0005)                                                                                            |
| [10. Communication et sécurité entre services](inter-services.md)   | Zéro confiance, jetons, sagas             | Délais, erreurs RFC 9457 ; maillage à venir                                                                                      |
| [11. Observabilité](observabilite.md)                               | Traces, métriques, objectifs              | Journaux JSON structurés                                                                                                         |
| [12. Pile technique](pile-technique.md)                             | Choix justifiés                           | Appliquée (ADR 0003)                                                                                                             |
| [13. Architecture du code](architecture-du-code.md)                 | Monorepo, clean architecture              | Appliquée                                                                                                                        |
| [14. Mise en œuvre et risques](mise-en-oeuvre.md)                   | Phases, portes, risques                   | Phase 1 en cours ([suivi](../suivi/phase-1.md))                                                                                  |

## 1. Objet, périmètre et principes

La plateforme couvre toute la chaîne de la mode sur mesure : de la soumission d'une commande à la livraison, en passant par la création du modèle, le patron, l'achat du tissu, l'essayage virtuel et la production en atelier. Elle réunit tous les acteurs de la filière (clients, stylistes, couturiers et leurs employés, vendeurs de tissus et de mercerie, prestataires spécialisés, livreurs, marques) autour d'un atelier virtuel et d'une communauté, pour que chaque échange nourrisse le suivant.

**Périmètre fonctionnel**

- Espace client : mesures, avatar, commandes, suivi, matières confiées, échanges.
- Espace atelier : employés et rôles, registre clients, commandes, attribution, planning, caisse, achats de tissu.
- Espace vendeur de tissus : catalogue numérisé, stock par boutique et par rouleau, partage du catalogue, commandes et réservations au mètre, livraison.
- Espace prestataire : demandes de broderie, teinture, impression ou plissé, devis, suivi, remise.
- Atelier virtuel : création de modèles en 2D, 2,5D et 3D, patrons, retouches, tissus numériques, motifs, exports.
- Communauté : profils, publication de modèles et de tissus, avis, place de marché.
- Transverse : paiements mobile money, livraison, notifications WhatsApp, IA d'assistance, données de la filière.

**Principes d'architecture**

1. **Moteurs déterministes, IA en appui.** Les patrons sont calculés par un moteur paramétrique exact ; l'IA ne produit que des paramètres et des suggestions, validés par un humain.
2. **Un seul format pivot par domaine.** Corps = mesures normalisées (ISO 8559-1) + mannequin MakeHuman ; vêtement = document de modèle (base tracée par FreeSewing, opérations génériques, matières), qui produit la spécification de patron GarmentSpec ([ADR 0019](../adr/0019-trace-freesewing.md), [ADR 0020](../adr/0020-document-de-modele-et-operations.md)) ; 3D = glTF.
3. **Services découplés par événements.** Chaque service possède ses données ; ils communiquent par API pour les lectures et par événements pour les changements d'état.
4. **Calcul interactif local, calcul lourd asynchrone.** Tracé, opérations, dessins, patrons, exports et drapé interactif tournent dans le navigateur ([ADR 0021](../adr/0021-studio-local-et-refonte-des-moteurs.md)) ; les rendus haute qualité et l'IA passent par une file de tâches et des machines GPU.
5. **Mobile d'abord, hors-ligne possible.** Les ateliers travaillent sur téléphone avec une connexion instable : les données du jour sont locales et se synchronisent.
6. **Plusieurs ateliers, données cloisonnées.** Chaque atelier est un espace isolé ; le client reste propriétaire de ses mesures et décide qui les voit.
7. **Licences vérifiées.** Seuls des composants utilisables commercialement (MIT, Apache, CC0) entrent en production ; pas de corps SMPL ni de poids non commerciaux.
8. **Une interface simple, faite de commandes.** Le studio est une scène et un fil d'étapes ; tout ce qui modifie un modèle est une commande typée, annulable, que l'IA pourra proposer et jamais appliquer seule ([ADR 0022](../adr/0022-interface-du-studio-v2.md), [ADR 0023](../adr/0023-preparation-ia.md)).

## Direction d'octobre 2026

La preuve de concept des [cinq tuniques](../suivi/essai-tuniques.md) a montré la chaîne 2D complète en quelques millisecondes dans le navigateur et un premier drapé 3D générique. L'architecture est recentrée sur le studio : calcul local, document de modèle, moteurs TypeScript, interface v2 prête pour l'IA ; le 2D d'abord, puis la 3D. Détail et feuille de route : [Plan d'action](../suivi/plan-action-plateforme.md).
