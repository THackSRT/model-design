# Studio de patron

Le studio calcule le patron d'un vêtement à partir des mesures d'un client et montre, à côté, un mannequin 3D
ajusté aux mêmes mesures. C'est l'écran de la phase 1. Deux onglets : **Patron** (par défaut), et **Tissus**
pour valider et paramétrer les préréglages des tissus. Quatre types de vêtement sont proposés : jupe droite, jupe
cercle, pantalon et corsage (avec ou sans manches) ; les tracés de GarmentCode sont validés par référence.

![Studio de patron : mesures à gauche, patron devant et dos au centre, mannequin 3D à droite](../assets/ecrans/studio-phase-1.png)

## Utiliser le studio

1. Ouvrir le studio : http://localhost:8080 avec la pile Docker, ou http://localhost:5173 en développement
   (voir [Installation](../demarrer/installation.md)).
2. Choisir la morphologie et saisir les mesures du client, en centimètres.
3. Choisir un type de vêtement et ses paramètres : jupe droite, jupe cercle, pantalon ou corsage.
4. Cliquer sur **Calculer le patron**. Le patron s'affiche au centre avec les pièces de coupe, le mannequin
   ajusté à droite ; faire glisser le mannequin pour le tourner. Bascule 3D / silhouettes 2D en bas.
5. Télécharger les pièces de coupe au format SVG, PDF A4 tuilé ou DXF-AAMA via le bouton **Exporter**.
6. Chaque calcul crée une nouvelle version du modèle ; son numéro s'affiche sous le bouton.

## Mesures acceptées

Les bornes viennent du contrat (`contracts/schemas/measurement-set.schema.json`) ; un champ hors bornes est
signalé et le calcul ne part pas. Les mesures obligatoires par type de vêtement sont indiquées ci-dessous.

### Mesures générales

| Mesure           | Obligatoire | Bornes      |
| ---------------- | ----------- | ----------- |
| Stature          | oui         | 90 à 230 cm |
| Tour de poitrine | oui         | 50 à 180 cm |
| Tour de taille   | oui         | 40 à 180 cm |
| Tour de bassin   | oui         | 60 à 190 cm |

### Jupe droite

| Paramètre           | Obligatoire | Bornes      |
| ------------------- | ----------- | ----------- |
| Longueur de la jupe | oui         | 30 à 130 cm |
| Aisance taille      | non (1 cm)  | 0 à 8 cm    |
| Aisance bassin      | non (4 cm)  | 0 à 20 cm   |

### Jupe cercle

| Paramètre           | Obligatoire | Bornes      |
| ------------------- | ----------- | ----------- |
| Longueur de la jupe | oui         | 30 à 130 cm |
| Aisance taille      | non (1 cm)  | 0 à 8 cm    |
| Fraction de cercle  | non (1)     | 0,25 à 1    |
| Largeur de ceinture | non         | 0 à 10 cm   |

### Pantalon

| Paramètre            | Obligatoire | Bornes      |
| -------------------- | ----------- | ----------- |
| Hauteur d'entrejambe | **oui**     | 50 à 100 cm |
| Longueur du pantalon | oui         | 50 à 120 cm |
| Aisance taille       | non (1 cm)  | 0 à 8 cm    |
| Aisance bassin       | non (4 cm)  | 0 à 20 cm   |
| Tour de chevilles    | non         | 15 à 50 cm  |

### Corsage

| Paramètre                  | Obligatoire | Bornes      |
| -------------------------- | ----------- | ----------- |
| Tour de poitrine           | **oui**     | 50 à 180 cm |
| Longueur taille dos        | **oui**     | 20 à 60 cm  |
| Longueur corsage           | oui         | 10 à 50 cm  |
| Aisance poitrine           | non (2 cm)  | 0 à 10 cm   |
| Aisance taille             | non (1 cm)  | 0 à 8 cm    |
| Profondeur encolure devant | non         | 0 à 15 cm   |
| Profondeur encolure dos    | non         | 0 à 10 cm   |
| Manches                    | optionnel   | —           |

## Messages

| Message                                   | Cause                                                                | Que faire                                |
| ----------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| « Mesure obligatoire manquante… »         | Mesure requise pour ce type (ex. hauteur d'entrejambe pour pantalon) | Saisir la mesure                         |
| « Patron impossible avec ces mesures. »   | Vêtement impossible (ex. jupe trop courte)                           | Ajuster les mesures ou les paramètres    |
| « Le moteur de patronage ne répond pas. » | Moteur arrêté ou trop lent                                           | Vérifier que le moteur tourne, réessayer |
| « Le service est injoignable. »           | Service `designs` arrêté                                             | Démarrer la pile (`pnpm stack:up`)       |

## Limites actuelles

- Pas encore : édition des paramètres du modèle, liste et comparaison des versions (travail 1.16) ; drapé 3D en
  tâche (travail 1.19) ; tests de bout en bout (travail 1.24).
- Les références golden des tracés sont déclarées « candidates » : elles doivent être validées par un modéliste
  sur toile (porte de sortie 1.25).
