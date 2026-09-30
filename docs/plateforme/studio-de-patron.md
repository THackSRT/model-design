# Studio de patron

Le studio calcule le patron d'un vêtement à partir des mesures d'un client et montre, à côté, un mannequin 3D
ajusté aux mêmes mesures. C'est l'écran de la phase 1 ; il ne propose pour l'instant qu'une **jupe droite au
tracé provisoire**, qui valide la chaîne de calcul, pas la coupe.

![Studio de patron : mesures à gauche, patron devant et dos au centre, mannequin 3D à droite](../assets/ecrans/studio-phase-1.png)

## Utiliser le studio

1. Ouvrir le studio : http://localhost:8080 avec la pile Docker, ou http://localhost:5173 en développement
   (voir [Installation](../demarrer/installation.md)).
2. Choisir la morphologie et saisir les mesures du client, en centimètres.
3. Régler la jupe : longueur, aisances à la taille et au bassin, évasement de l'ourlet.
4. Cliquer sur **Calculer le patron**. Le patron (devant et dos, coupés au pli) s'affiche au centre, le
   mannequin ajusté à droite ; faire glisser le mannequin pour le tourner.
5. Chaque calcul crée une nouvelle version du modèle ; son numéro s'affiche sous le bouton.

## Mesures acceptées

Les bornes viennent du contrat (`contracts/schemas/measurement-set.schema.json`) ; un champ hors bornes est
signalé et le calcul ne part pas.

| Mesure                | Obligatoire | Bornes      |
| --------------------- | ----------- | ----------- |
| Stature               | oui         | 90 à 230 cm |
| Tour de poitrine      | oui         | 50 à 180 cm |
| Tour de taille        | oui         | 40 à 180 cm |
| Tour de bassin        | oui         | 60 à 190 cm |
| Longueur de la jupe   | oui         | 30 à 130 cm |
| Aisance taille        | non (1 cm)  | 0 à 8 cm    |
| Aisance bassin        | non (4 cm)  | 0 à 20 cm   |
| Évasement de l'ourlet | non (0 cm)  | 0 à 20 cm   |

## Messages

| Message                                   | Cause                                              | Que faire                                |
| ----------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| « Patron impossible avec ces mesures. »   | La jupe s'arrête au-dessus de la ligne des hanches | Allonger la jupe                         |
| « Le moteur de patronage ne répond pas. » | Moteur arrêté ou trop lent                         | Vérifier que le moteur tourne, réessayer |
| « Le service est injoignable. »           | Service `designs` arrêté                           | Démarrer la pile (`pnpm stack:up`)       |

## Limites actuelles

- Un seul vêtement, au tracé simplifié ; les patrons de production viendront de GarmentCode (travail 1.11).
- Le mannequin est calculé dans le navigateur et fige l'écran une fraction de seconde (travail 1.14).
- Pas encore de valeurs de couture ni d'export (travaux 1.17 et 1.18).
