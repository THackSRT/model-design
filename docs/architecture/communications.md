# 6. Communications

Cinq modes d'échange suffisent : appels d'API pour lire et demander, événements pour annoncer un changement, tâches pour le calcul lourd, temps réel pour prévenir l'utilisateur, synchronisation pour le travail hors-ligne.

| Mode                       | Technologie                                                                       | Qui parle à qui                                                   | Usage                                                                |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| API synchrone              | HTTPS + JSON (REST), passerelle d'API                                             | Applications → passerelle → services ; services → moteurs rapides | Lire, créer, modifier ; patronage et mannequin (< 1 s)               |
| Événements                 | Bus de messages (NATS JetStream ou Kafka), schémas versionnés                     | Service → bus → services abonnés                                  | `order.stage_changed` déclenche notification, planning, statistiques |
| Tâches de calcul           | File de tâches (flux NATS JetStream en mode file de travail) + workers CPU et GPU | Services → file → moteurs lourds → stockage → événement de fin    | Drapé 3D, imbrication, rendus, IA, mesures par photo                 |
| Temps réel                 | WebSocket (ou SSE) via la passerelle                                              | Services → applications connectées                                | Statut de commande, messages, fin d'un drapé                         |
| Synchronisation hors-ligne | Base locale + journal de modifications, reprise à la reconnexion                  | Application mobile ↔ service de synchronisation                   | Travail en atelier sans réseau                                       |

**Règles**

- Un service ne lit jamais la base d'un autre : il appelle son API ou garde une copie alimentée par ses événements.
- Chaque événement porte un identifiant unique ; les abonnés sont idempotents (un doublon ne change rien).
- L'écriture en base et la publication de l'événement passent par une table « boîte d'envoi » (outbox) : pas d'événement perdu ni fantôme.
- Les fichiers lourds (glTF, PDF, images) ne transitent jamais par le bus : on passe leur adresse dans le stockage objet.

## Séquence A — Du modèle au vêtement 3D

1. Le styliste ajuste un curseur dans le studio ; l'application appelle `POST /designs/{id}/versions`.
2. Le service Modèles appelle le moteur de Patronage (synchrone, < 1 s) avec les paramètres et les mesures de l'avatar choisi.
3. La spécification revient ; le studio affiche aussitôt le patron 2D et l'aperçu 2D ou 2,5D.
4. Le service Modèles dépose une tâche `drape` dans la file (spécification, avatar, tissu).
5. Un worker GPU du moteur de Drapé simule, écrit le glTF dans le stockage objet, publie `pattern.draped`.
6. Le moteur de Rendu calcule les vues 2D et les cartes 2,5D, publie `render.ready`.
7. Le studio reçoit l'avis en temps réel et charge la vue 3D ; si le client a accès au projet, il la voit aussi.

## Séquence B — De la commande à la livraison

1. Le client commande un modèle (communauté ou atelier) ; `order.created`.
2. L'atelier envoie un devis ; le client paie l'acompte par mobile money ; le webhook de l'agrégateur produit `payment.succeeded` ; la commande passe « confirmée ».
3. Les mesures sont prises ou mises à jour ; `measurement.recorded` déclenche le recalcul de l'avatar puis du patron.
4. Le tissu confié est enregistré (photo, métrage) ; `deposit.received`.
5. Le client valide la maquette 2D ou 3D ; le patron est figé ; la Production crée les tâches (coupe, assemblage, broderie, finition).
6. Le chef d'atelier attribue les tâches ; chaque tâche terminée fait avancer l'étape ; chaque changement d'étape notifie le client (WhatsApp + application).
7. Essayage, retouches, contrôle qualité ; `order.ready`.
8. Retrait par QR code ou livraison avec preuve de remise ; paiement du solde ; restitution des chutes ; demande d'avis.

## Séquence C — Assistant IA

1. L'utilisateur envoie une photo et une phrase (« ce modèle, manches longues »).
2. Le service IA interroge un modèle multimodal, qui répond par une proposition de paramètres conforme au schéma des composants.
3. La proposition est validée (schéma, bornes) puis envoyée au moteur de Patronage comme un brouillon.
4. L'utilisateur voit le résultat, l'accepte, le retouche ou l'annule ; seul l'accord crée une version.

## Séquence D — Du patron au tissu, aux prestataires et au paiement

1. Le patron figé donne le métrage exact : le moteur de Production calcule le plan de coupe avec la laize, le sens et le raccord de motif du tissu choisi.
2. Le service Achats interroge le Catalogue tissus et le Stock fournisseur : boutiques qui ont ce tissu (ou un équivalent proposé par l'IA), métrage disponible par rouleau et par bain de teinture, prix au mètre, distance.
3. L'atelier ou le client choisit ; le Stock fournisseur réserve le métrage sur un rouleau pour une durée limitée ; stock.reserved.
4. La commande au mètre est passée et payée (ou portée au compte de l'atelier) ; purchase.placed ; le vendeur la reçoit dans son application et sur WhatsApp.
5. Le vendeur coupe et confirme le métrage réel ; purchase.cut ; le stock baisse, et stock.low part si le seuil de réassort est atteint.
6. La Livraison organise le retrait ou la collecte ; purchase.shipped puis shipment.delivered ; le tissu entre dans le stock de l'atelier, rattaché à la commande client.
7. Si le modèle prévoit broderie, teinture ou impression, la Sous-traitance envoie au prestataire le fichier (broderie, placement du motif sur les pièces) et le métrage ; job.requested ; à la remise, job.delivered fait avancer l'étape de production.
8. À la livraison confirmée, les Paiements versent à chacun sa part (vendeur, prestataire, livreur), moins les frais de la plateforme ; payout.sent. L'avis du client porte aussi sur le tissu et le prestataire, et nourrit le Catalogue et la recommandation.
