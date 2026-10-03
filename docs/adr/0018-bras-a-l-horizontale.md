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
- **Défaut inchangé : 9°.** Une requête sans l'option reste valide et garde la pose à 9°. Son drapé, lui, change
  avec ce lot : `ENGINE_VERSION` du drapé passe à 0.12.0 (elle entre dans la clé canonique, ADR 0013) et le corps
  femme par défaut reçoit une poitrine (1.51b) ; un drapé déjà calculé n'est donc pas réutilisé.
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
- La sous-poitrine estimée par défaut a été essayée (1.51) puis retirée : la cible MakeHuman
  `measure-underbust-circ` déplace aussi le bas du tronc (entrejambe −10,7 mm, jupe cercle −57 mm sous la taille) ;
  la forme de poitrine passe par des cibles dédiées (1.51b, ci-dessous). Un `underBustGirthMm` fourni n'est pas
  ajusté non plus (comme avant ce lot), pour la même raison.
- **Corps du mannequin et cache du drapé** : la clé canonique du drapé ne contient que l'`ENGINE_VERSION` du drapé,
  pas de version du mannequin. Tout changement du corps produit par le mannequin pour une même demande (cibles,
  défauts, ajustement) oblige donc à relever l'`ENGINE_VERSION` du drapé.

## Conséquences sur le drapé (1.50c, `ENGINE_VERSION` 0.12.0)

Mesures en brouillon, mesures fictives des références, popeline, bras à 90° (les tests brouillon passent de 30° à 90°).

- **Repère de manche** (`placement/frames.ts`) : l'axe du bras peut être horizontal. Le niveau d'ancrage se lit par la
  hauteur tant que la pente de l'axe dépasse 0,3, sinon il reste à l'épaule (même résultat à 30° qu'avant, l'ancre
  étant à la hauteur de l'épaule) ; la face extérieure du bras devient le dessus. Seul un axe qui pointe au-dessus de
  l'horizontale refuse la pose.
- **Tiennent leurs critères à 90°** : jupe droite, jupe cercle (bas de ceinture −38,3 mm, départ 92,3 mm, allongement
  p95 0,241, rayon d'ourlet 1,56 fois la hanche), pantalon (départ 94,3 mm, taille −30,5 mm), pénétration nulle et
  coutures fermées pour tous.
- **Bas du corsage : critère redéfini (remplace, pour les corsages, le critère « bas à `waist` ± 40 mm » de
  l'ADR 0013).** Un corsage pend des épaules, donc le critère se lit depuis l'épaule :
  la hauteur attendue est `waist` + Δépaule, Δépaule étant le déplacement vertical du dessus de l'épaule du corps
  (sommet dans une bande de 12 mm autour de l'articulation) entre la pose demandée et la pose de référence à 30°
  (nul à 30°, seuls les corsages l'appliquent). À 90° : bas brut à −45,3 mm de `waist`, Δépaule −6,8 mm, bas corrigé
  à −38,5 mm ; tolérance de ±40 mm inchangée. Au critère d'origine, le bas brut (−45,3 mm) échouerait : c'est une
  redéfinition assumée, pas une garde de départ. Cause : la pose abaisse le dessus de l'épaule quand le bras se lève
  (1.50b, −7,6 mm), alors qu'une épaule réelle monte. Correctif à faire dans le mannequin (épaule qui monte à 90°) ;
  ce critère se relira alors contre le corps corrigé.
- **Corsage à manches** : `body-penetration` à 90° comme à 30° (pénétration 35,3 mm non convergée à 90°, 27,3 mm à 30°).
  La manche du patron reste trop étroite pour le bras : 90° ne la résout pas. L'habillage géométrique (1.50e1) le
  mesure : rayon de la manche du patron 3,0 à 3,7 cm, bras de l'avatar environ 4 cm ; la cause de 1.46 est donc
  dans le patronage, pas dans la pose.
- **Cible `test-standard` à 90°** : toujours rouge pour les mêmes trois vêtements. Jupe cercle : bas de ceinture
  −54,1 mm (−54), rayon d'ourlet 1,36 fois la hanche (1,36) ; corsage : bas à 51,1 mm de `waist` (42, donc pire) ;
  corsage à manches : `body-penetration`. Jupe droite et pantalon tiennent.
- **Poitrine féminine (1.51b)** : 36 cibles MakeHuman `breast/` (.mhz +1,2 %), bonnet 0,2 et fermeté 0,5 pour la
  femme par défaut ; le bonnet est plafonné par le plan de mesure de la sous-poitrine (écart poitrine - sous-poitrine
  108 mm ; 59 mm à 0,6). Couplage par l'ajustement global : le bonnet change la corpulence retenue, d'où un léger effet
  sur le pantalon. Les deux gardes de non-régression du départ sont recalées : corsage 80 → 95 mm (89,8 mm mesurés),
  pantalon 95 → 100 mm (95,27 mm), toutes deux sous le critère de départ de l'ADR 0013 (120 mm) ; empreintes godets
  recalées. Les critères du résultat final ne changent pas, hormis la référence du bas des corsages ci-dessus.
