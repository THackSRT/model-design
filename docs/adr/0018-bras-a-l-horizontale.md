# 0018 — Bras de l'avatar jusqu'à l'horizontale : `armAngleDeg` de 0 à 90°, sens de l'angle corrigé

**Contexte.** L'option `armAngleDeg` de `contracts/schemas/avatar-options.schema.json` (ADR 0013) acceptait 0 à
45°, 9° par défaut, avec la description « Bras abaissés depuis l'horizontale ». Cette description est fausse : le
moteur mannequin (`engines/mannequin/src/core/pose.ts`, `armFrame` et `pose`) amène la direction épaule-poignet à
`armAngleDeg` **de la verticale** : 0° = bras le long du corps, 90° = bras à l'horizontale. Le code a toujours suivi
ce sens ; seul le texte du contrat le contredisait.

Constats du drapé (ADR 0013) : à 9°, le bras touche le flanc (27 sommets du corsage repoussés de 20 mm au départ ;
à 30° : 4 sommets, 9 mm). Les critères des corsages et de la jupe cercle se mesurent donc à 30° et le studio demande
le drapé à 30°. Le corsage à manches échoue encore : la manche du patron est trop étroite pour le bras de l'avatar
(1.46, diagnostic à faire). Or le corps de référence de GarmentCode (ADR 0010), dérivé de SMPL, est en pose en T,
la pose de repos de SMPL : ses manches sont posées et drapées sur un bras horizontal. Un bras à 30° serre la manche
sous l'aisselle et le long du biceps là où un bras à 90° la laisse ouverte ; une partie de l'écart vu en 1.46 peut
venir de la pose plutôt que du tracé.

**Décision.**

- **Bornes** : `armAngleDeg` passe de 0–45 à **0–90°**. Élargissement compatible (ADR 0002) : tout document valide
  avant l'est encore, pas de nouvelle version de schéma ni d'événement.
- **Sens écrit dans le contrat** : « Écart du bras à la verticale, en degrés (0 : le long du corps ; 90 : à
  l'horizontale, pose en T) ». Le langage commun garde `armAngleDeg` (suffixe `Deg`).
- **Défaut inchangé : 9°.** Une requête sans l'option garde exactement son corps et son drapé ; la clé canonique
  d'un drapé déjà calculé ne change pas (ADR 0013, « même demande canonique, même drapé »).
- **Pose de travail du studio et du drapé : 90° (pose en T), envoyée explicitement** par le studio (1.50d), comme
  30° aujourd'hui. Le contrat ne change pas son défaut pour cela : le défaut décrit le corps « au repos » du
  mannequin, la pose de travail est un choix de l'écran.
- **Ordre** : contrat (1.50a) → mannequin validé à 90°, épaule sans écrasement (1.50b) → drapé recalibré à 90° pour
  les cinq vêtements (1.50c) → studio à 90° (1.50d). Le studio n'envoie pas 90° avant que 1.50c soit vert.
- **Drapé à recalibrer (1.50c)** : les critères à 30° de l'ADR 0013 (corsages, jupe cercle) et les placements qui
  dépendent de l'axe du bras (manches posées le long de cet axe, haut de manche tenu dessus, repli sur l'épaule,
  profil sagittal « sans les bras ») sont repris à 90°. Les essais à 9° restent : succès conforme ou problème typé,
  jamais un faux succès. Le résultat de 1.50c alimente le diagnostic 1.46 (manche trop étroite : pose ou patron).

**Conséquences.**

- Code généré mis à jour par `pnpm contracts:gen` : types TS (`avatar-options`, `drape-job`, `drape-request`,
  `drape-requested`, OpenAPI de `designs`), schéma JSON embarqué et modèle Python (`le=90`). Aucun autre contrat ne
  recopie ces bornes : `drape-job` et `drape-request` font référence à `avatar-options`.
- **Déploiement** (services déployés séparément) : `designs` et le travailleur du drapé doivent tourner avec le
  contrat élargi avant qu'un studio envoie plus de 45° ; sinon la validation rejette la demande (erreur typée, pas
  de donnée perdue).
- **Risque mannequin** : à 90°, la rotation partielle de `pose.ts` peut écraser ou déchirer l'épaule et décaler les
  anneaux de mesure du bras ; 1.50b le vérifie (aucune mesure réelle dans les tests : corps de synthèse seulement).
- **Risque drapé** : à 90°, le dessous de bras et le flanc s'écartent (moins de collisions au départ) mais les
  manches pendent autrement ; les budgets de pas et les critères de l'ADR 0013 peuvent bouger. Un changement de
  comportement du moteur relève sa `ENGINE_VERSION`.
- Les mentions de 9° et 30° dans l'ADR 0013 restent vraies pour l'historique ; cette fiche les complète.
