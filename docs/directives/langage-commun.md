# 2. Langage commun

Le code, les contrats, la base et les journaux sont en anglais ; l'interface est en français (puis d'autres
langues) par les catalogues de traduction. Chaque terme métier a un seul nom dans le code, fixé ici ; un nouveau
terme s'ajoute à ce tableau dans la même demande de fusion que le code qui l'introduit.

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

## Unités et valeurs

- **Longueurs** : millimètres, suffixe `Mm` (`chestGirthMm`, `fabricWidthMm`) ; entiers pour les mesures
  saisies, décimaux permis pour la géométrie. La conversion vers les centimètres de GarmentCode ou de MakeHuman
  se fait dans l'adaptateur du moteur, nulle part ailleurs (`engines/mannequin/src/index.ts`,
  `engines/patterning/src/patterning/spec/`).
- **Montants** : entier dans la plus petite unité de la devise + code ISO 4217
  (`{ amountMinor: 15000, currency: "XOF" }`, type `Money` de `@atelier/kernel`) ; jamais de nombre à virgule.
- **Dates** : ISO 8601 en UTC dans le code, les contrats et la base ; conversion au fuseau de l'utilisateur à
  l'affichage seulement.
- **Identifiants** : UUID v7 générés par le service propriétaire, typés par entité (`Id<'design'>`) pour qu'on ne
  puisse pas les confondre.
- **Événements** : `<entité>.<verbe au passé>` en minuscules (`design.versioned`, `stock.reserved`).
