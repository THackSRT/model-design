# Recommandation de taille en ligne (type Unisize) : analyse et plan

Référence étudiée : [Unisize](https://unisize.net/), un service japonais de recommandation de taille
utilisé par plus de 250 sites de mode.

## 1. Ce que fait Unisize

| Brique | Fonctionnement |
| --- | --- |
| **Questionnaire** | Le client répond à quelques questions (taille, poids, âge, silhouette, coupe préférée), sans mètre ruban. |
| **Avatar 3D** | Un avatar est généré à ses mesures estimées. Le vêtement est montré dessus sous 4 angles, avec la position de l'ourlet et de la taille. |
| **Recommandation** | La taille conseillée s'affiche dans un bandeau de la fiche produit, sans quitter la page. Le client peut aussi comparer avec un vêtement qu'il possède. |
| **Base « Brand Body »** | Elle croise les profils des clients avec les tableaux de tailles des marques et l'historique d'achats, grâce à un algorithme d'ajustement et à l'apprentissage automatique. |
| **Tableau de bord** | Pour la marque : démographie et silhouettes des clients, efficacité du widget, ventes et optimisation des stocks. |
| **Intégration** | Une balise JavaScript à ajouter sur le site marchand. |
| **Résultats annoncés** | 30 % d'utilisation, taux de conversion multiplié par 2,5, 20 % de retours en moins. |

## 2. Où en est le prototype

| Brique | Prototype actuel | Reste à faire |
| --- | --- | --- |
| Questionnaire → mesures | **Fait.** Sexe, âge, taille, poids et 4 questions de silhouette donnent 14 mesures. Le modèle est appris sur **ANSUR II** (6 068 personnes). | Recalibrer sur la clientèle réelle (voir § 4). |
| Avatar 3D | **Fait.** L'avatar est calé au centimètre sur les mesures, avec 4 vues et une rotation libre. | Postures, visage stylisé, carte des zones serrées sur l'avatar. |
| Recommandation | **Fait.** Chaque taille est comparée au corps, zone par zone (tours et longueurs), selon la coupe préférée. On obtient une confiance et un conseil entre deux tailles. | Comparaison avec un vêtement que le client possède ; apprentissage à partir des retours. |
| Bandeau et fenêtre boutique | **Démo.** `boutique.html` montre le bandeau « Votre taille : M » et la fenêtre avec l'avatar. Le profil est mémorisé et resservi sur tous les articles. | Script d'intégration autonome, avec une ligne à coller sur n'importe quel site. |
| Tableaux de tailles | Générés depuis nos patrons : cotes finies calculées, pas saisies. | Import des tableaux des marques clientes (CSV ou saisie), avec leurs propres aisances. |
| Base clients et tableau de bord | Pas encore | Serveur, comptes marques, statistiques (voir § 3). |
| **Sur-mesure** | **Fait.** Unisize ne le propose pas. Quand aucune taille ne convient, les mesures estimées passent directement dans l'atelier : avatar, patrons 1:1 et plan de coupe. | Validation par un tailleur, prise de mesures réelle. |

Le dernier point est notre différence : **« votre taille, ou votre vêtement sur mesure »**. Il s'adresse
bien aux marques et ateliers où le sur-mesure est courant (tailleurs, créateurs de wax et de bazin), là où
Unisize s'arrête à la taille standard.

## 3. Architecture cible (service web)

```
Site marchand ──(balise <script>)──► Widget (questionnaire + avatar + recommandation)
                                         │   API REST / JSON
                                         ▼
                             Service de recommandation
              ┌──────────────┬──────────────┼────────────────┬──────────────┐
         Estimation     Tableaux de      Moteur        Profils clients    Événements
         des mesures    tailles et       d'ajustement  (consentement)     (vues, choix,
         (modèles)      aisances des     (par zone)                        achats, retours)
                        marques
                                         │
                   Tableau de bord marque ◄┘      Atelier sur-mesure (patrons, coupe)
```

- **Widget** : le code actuel (`js/sizefinder.js` et suivants) empaqueté en un seul script.
  Configuration par `data-product="…"`. Poids visé : moins de 200 ko hors three.js, avec l'avatar
  chargé seulement à l'ouverture.
- **API** :
  - `POST /estimate` : questionnaire → mesures ;
  - `POST /recommend` : profil + produit → taille et détail par zone ;
  - `POST /events` : vue, taille choisie, achat, retour et son motif.
- **Données** : PostgreSQL (marques, produits, tableaux de tailles, profils, événements) et un entrepôt
  analytique pour le tableau de bord.
- **Boucle d'apprentissage** : les achats gardés et les retours pour « trop petit / trop grand » ajustent,
  pour chaque marque, les plages d'aisance idéales du moteur.

## 4. Données : le point décisif

- ANSUR II est une base publique **militaire et américaine** : adultes de 17 à 58 ans, plutôt sportifs.
  Elle donne un bon point de départ, mais elle ne représente pas une clientèle d'Afrique de l'Ouest
  ou d'Europe.
- La précision a été mesurée par validation croisée ; les chiffres ci-dessous sont l'erreur moyenne
  sur les tours de poitrine, de taille et de bassin.

  | Réponses de silhouette | Homme | Femme |
  | --- | --- | --- |
  | Sans réponse | 2,4 / 3,2 / 2,0 cm | 3,3 / 3,7 / 2,3 cm |
  | Réponses parfaites (borne optimiste) | 1,1 / 1,4 / 0,9 cm | 1,5 / 1,7 / 1,0 cm |

  Les vraies réponses, données à partir des pictogrammes, se situeront entre ces deux cas.
- **Recommandation** : chaque commande sur mesure de l'atelier fournit une vraie paire
  « réponses au questionnaire / mesures prises par le tailleur ». Il faut les enregistrer pour
  réentraîner le modèle sur la population réelle (`tools/fit_anthropometry.py` accepte n'importe quel
  CSV au même format).

## 5. Données personnelles

Les mensurations sont des données sensibles pour les clients.
- **Consentement :** un consentement explicite est nécessaire.
- **Stockage :** la recommandation peut rester sur l'appareil, comme dans la démo où le profil est
  en `localStorage` ; l'envoi au serveur doit être une option.
- **Anonymisation :** les données sont anonymisées pour les statistiques des marques.
- **Contrôle par le client :** il peut supprimer son profil à tout moment.

Le RGPD s'applique pour l'Europe, et les lois locales sur la protection des données s'appliquent aussi
(par exemple au Sénégal ou en Côte d'Ivoire).

## 6. Étapes proposées

1. **Pilote avec une boutique :** le widget est installé sur 5 à 10 produits, avec la mesure des
   retours avant et après.
2. **Import des tableaux de tailles :** saisie ou CSV, avec les aisances par type de vêtement
   (kaftan, chemise, pantalon, robe).
3. **Collecte des mesures réelles :** atelier et magasins partenaires, puis réentraînement du modèle.
4. **Script d'intégration et API hébergée**, puis tableau de bord marque.
5. **Photo → mesures :** deux photos, face et profil, pour affiner le profil au-delà du questionnaire.
