# 2. Langage commun

Le code, les contrats, la base et les journaux sont en anglais ; l'interface est en français (puis d'autres
langues) par les catalogues de traduction. Chaque terme métier a un seul nom dans le code, fixé ici ; un nouveau
terme s'ajoute à ce tableau dans la même demande de fusion que le code qui l'introduit.

| Terme métier                                                                  | Nom dans le code                                                           | Service propriétaire           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------ |
| Organisation (atelier, boutique de tissus, prestataire, livreur, marque)      | `Organization`, `OrganizationKind`                                         | organizations                  |
| Membre                                                                        | `Member`                                                                   | organizations                  |
| Fiche client                                                                  | `CustomerProfile`                                                          | customers                      |
| Jeu de mesures                                                                | `MeasurementSet`                                                           | customers                      |
| Avatar                                                                        | `Avatar`                                                                   | avatars                        |
| Modèle, version de modèle                                                     | `Design`, `DesignVersion`                                                  | designs                        |
| Patron (spécification), pièce, bord, couture, cran, emplacement de cran       | `GarmentSpec`, `Panel`, `Edge`, `Seam`, `Notch`, `NotchPlacement`          | designs                        |
| Placement d'une pièce autour du corps                                         | `Panel.placement` : zone, côté, sens, ancrage, aisance                     | designs, moteur patronage      |
| Habillage (vêtement sur le corps, géométrique)                                | `GarmentMesh`, `dressMannequin()`                                          | mannequin                      |
| Drapé (vêtement simulé avec dynamique physique)                               | `Drape` : spécification, avatar, tissu, résultat glTF                      | designs, moteur drapé          |
| Zone trop juste (lieu où le vêtement est serré)                               | `tightZones`, perte d'aisance                                              | mannequin, drapé               |
| Aisance (distance initiale pièce–corps, aussi écart dorsal à la fin)          | `clearanceMm` (placement), `ease` (résultat)                               | patronage, drapé               |
| Tissu préréglé (propriétés estimées)                                          | `FabricPreset` : cotton-poplin, wax, bazin, linen, denim, silk-sat, jersey | drapé                          |
| Propriétés physiques d'un tissu (les six, toutes présentes)                   | `FabricPhysics`                                                            | drapé                          |
| Banc d'essai des tissus (écran de validation des préréglages)                 | `useFabricBench()`, `engines/drape/src/bench/`                             | drapé (studio)                 |
| Rapport de validation, revue d'un préréglage, verdict                         | `FabricValidationReport`, `FabricPresetReview`, `verdict`                  | drapé (studio)                 |
| Mesures d'atelier (brutes), valeurs déduites, valeurs candidates              | `FabricBenchMeasurements`, `FabricDerivedValues`, `candidateFabric()`      | drapé                          |
| Essais d'atelier : pesée, épaisseur, allongement d'une bande                  | `FabricWeighing`, `FabricThicknessTest`, `StripStretchTest`                | drapé                          |
| Essais d'atelier : porte-à-faux (flexion), plan incliné (frottement)          | `CantileverBendingTest`, `InclinedPlaneFrictionTest`                       | drapé                          |
| Longueur de flexion, rigidité de flexion                                      | `bendingLengthWarpMm`, `bendingLengthWeftMm`, `bendingRigidityMicroNm`     | drapé                          |
| Essai de drapé de Cusick, coefficient de drapé                                | `CusickSimulation`, `runCusickTest()`, `drapeCoefficient`                  | drapé                          |
| Droit fil, laize, métrage                                                     | `grainline`, `fabricWidthMm`, `fabricLengthMm`                             | designs, production            |
| Pièces de coupe, pièce de coupe, ligne de coupe, ligne de couture, cran tracé | `CutPattern`, `CutPiece`, `cutLine`, `seamLine`, `NotchMark`               | moteur manufacturing           |
| Pince (deux bords consécutifs cousus ensemble), pont de pince                 | `dart_pairs`, `bridge_contour` (moteur)                                    | moteur manufacturing           |
| Valeur de couture (par bord ou par défaut)                                    | `seamAllowance`, `allowanceMm`, `FinishingOptions`                         | moteur manufacturing           |
| Taille, gradation, écart de gradation                                         | `SizeLabel`, `GradedPattern`, `gradeRules`                                 | moteur manufacturing           |
| Plan de coupe, placement, efficience                                          | `CuttingPlan`, `Placement`, `efficiency`                                   | moteur manufacturing           |
| Tissu plié ou à plat, sens du tissu, lisière                                  | `layout`, `FabricDirection`, `selvedge`                                    | moteur manufacturing           |
| Commande client, étape                                                        | `Order`, `OrderStage`                                                      | orders                         |
| Tâche                                                                         | `Task`                                                                     | production                     |
| Dépôt de matière                                                              | `MaterialDeposit`                                                          | workshop-stock                 |
| Article tissu, coloris, rouleau                                               | `FabricArticle`, `Colorway`, `Roll`                                        | fabric-catalog, supplier-stock |
| Réservation                                                                   | `Reservation`                                                              | supplier-stock                 |
| Commande d'achat                                                              | `PurchaseOrder`                                                            | purchasing                     |
| Demande de prestation                                                         | `ServiceJob`                                                               | subcontracting                 |
| Paiement, versement                                                           | `Payment`, `Payout`                                                        | payments                       |
| Envoi                                                                         | `Shipment`                                                                 | delivery                       |
| Publication, annonce                                                          | `Post`, `Listing`                                                          | community                      |

## Unités et valeurs

- **Longueurs** : millimètres, suffixe `Mm` (`chestGirthMm`, `fabricWidthMm`) ; entiers pour les mesures
  saisies, décimaux permis pour la géométrie. La conversion vers les centimètres de GarmentCode ou de MakeHuman
  se fait dans l'adaptateur du moteur, nulle part ailleurs (`engines/mannequin/src/index.ts`,
  `engines/patterning/src/patterning/spec/`).
- **Autres grandeurs physiques** : l'unité est le suffixe du nom : `G` (grammes), `Mm2`, `GPerM2`, `Percent`,
  `Deg` (degrés, `armAngleDeg`, `slideAnglesDeg`), `MicroNm` (µN·m) ; une grandeur sans unité le dit dans sa
  description (`frictionCoefficient`, `drapeCoefficient`).
- **Montants** : entier dans la plus petite unité de la devise + code ISO 4217
  (`{ amountMinor: 15000, currency: "XOF" }`, type `Money` de `@atelier/kernel`) ; jamais de nombre à virgule.
- **Dates** : ISO 8601 en UTC dans le code, les contrats et la base ; conversion au fuseau de l'utilisateur à
  l'affichage seulement.
- **Identifiants** : UUID v7 générés par le service propriétaire, typés par entité (`Id<'design'>`) pour qu'on ne
  puisse pas les confondre.
- **Crans** : emplacement sur un bord (`NotchPlacement`) : identifiant du bord, distance en mm depuis le début du
  bord, nombre de crans (1–3) et source (`requested` : demandé par la requête ou fourni par la spécification du patron ; `auto` : posé par le
  moteur à une jonction de coutures ou aux extrémités d'une pince).
  `Notch` et `NotchRequest` l'étendent, selon le contexte.
- **Événements** : `<entité>.<verbe au passé>` en minuscules (`design.versioned`, `stock.reserved`).
