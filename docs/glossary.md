# Glossaire (langage commun)

Un terme métier = un seul nom dans le code, du contrat à la base et à l'écran. Un nouveau terme s'ajoute ici
dans la même demande de fusion que le code qui l'introduit.

| Terme métier                                                             | Nom dans le code                                | Service propriétaire           |
| ------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------ |
| Organisation (atelier, boutique de tissus, prestataire, livreur, marque) | `Organization`, `OrganizationKind`              | organizations                  |
| Membre                                                                   | `Member`                                        | organizations                  |
| Fiche client                                                             | `CustomerProfile`                               | customers                      |
| Jeu de mesures                                                           | `MeasurementSet`                                | customers                      |
| Avatar                                                                   | `Avatar`                                        | avatars                        |
| Modèle, version de modèle                                                | `Design`, `DesignVersion`                       | designs                        |
| Patron (spécification), pièce, bord, couture, cran                       | `GarmentSpec`, `Panel`, `Edge`, `Seam`, `Notch` | designs                        |
| Droit fil, laize, métrage                                                | `grainline`, `fabricWidthMm`, `fabricLengthMm`  | designs, production            |
| Commande client, étape                                                   | `Order`, `OrderStage`                           | orders                         |
| Tâche                                                                    | `Task`                                          | production                     |
| Dépôt de matière                                                         | `MaterialDeposit`                               | workshop-stock                 |
| Article tissu, coloris, rouleau                                          | `FabricArticle`, `Colorway`, `Roll`             | fabric-catalog, supplier-stock |
| Réservation                                                              | `Reservation`                                   | supplier-stock                 |
| Commande d'achat                                                         | `PurchaseOrder`                                 | purchasing                     |
| Demande de prestation                                                    | `ServiceJob`                                    | subcontracting                 |
| Paiement, versement                                                      | `Payment`, `Payout`                             | payments                       |
| Envoi                                                                    | `Shipment`                                      | delivery                       |
| Publication, annonce                                                     | `Post`, `Listing`                               | community                      |

**Unités et valeurs.** Longueurs en millimètres, suffixe `Mm` (la conversion vers les centimètres de
GarmentCode ou de MakeHuman se fait dans l'adaptateur du moteur) ; montants entiers dans la plus petite unité
de la devise avec leur code ISO 4217 ; dates ISO 8601 en UTC ; identifiants UUID v7 typés par entité ;
événements `<entité>.<verbe au passé>`.
