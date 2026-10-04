# 0023 — Préparation à l'IA : les commandes comme seuls outils

**Contexte.** Un modèle d'IA s'intégrera plus tard au studio : décrire un vêtement en mots, partir d'une photo,
retoucher en langage naturel, recevoir des suggestions. Le principe d'architecture n° 1 tient toujours : les patrons
viennent d'un moteur déterministe, l'IA propose et un humain valide. L'essai des tuniques a fait à la main ce
qu'un assistant fera : décomposer cinq photos en une base et une liste d'opérations.

**Décision.**

- **L'IA n'a qu'une interface : le catalogue des commandes.** Les schémas des opérations (ADR 0020) et des autres
  commandes du studio, avec leurs descriptions en français, sont exportés comme outils. Une proposition de l'IA est
  un lot de commandes accompagné d'une explication.
- **Rien n'est appliqué sans accord** : une proposition se prévisualise sur la scène (différence sur le dessin, le
  patron ou la 3D) ; l'accepter l'applique en une seule étape annulable ; le journal garde qui a accepté quoi.
- **Emplacements préparés dès la phase 1, derrière un drapeau** : la palette de commandes accepte du texte libre
  (recherche de commandes aujourd'hui, assistant demain) ; un panneau Assistant affiche des suggestions déterministes
  (par exemple « une bande d'ourlet assortie au plastron ») et, plus tard, les propositions de l'IA ; l'étape Modèle
  prévoit une entrée « Partir d'une photo ».
- **Passerelle future `assistant`** sur le serveur : indépendante du fournisseur (Claude par défaut), sans état,
  reçoit le résumé du document et la liste des outils permis, n'écrit jamais dans les données. Les mesures et les
  photos de client ne partent qu'avec un consentement explicite (ADR à venir sur les données envoyées). Consignes
  versionnées dans `prompts/`, réponses validées par schéma, jeu d'évaluation rejoué à chaque changement.
- **Premier jeu d'évaluation** : les cinq tuniques de l'essai, de la photo au document attendu.
- **Aucune dépendance d'IA dans le code de la phase 1** : seulement les types, l'export des schémas et les
  emplacements d'interface.

**Conséquences.**

- Tout ce que l'interface sait faire doit exister en commande, avec un schéma et une description : c'est aussi ce qui
  rend le studio testable et pilotable au clavier.
- Une proposition invalide est refusée par la validation des commandes, comme une saisie humaine invalide.
- Les coûts et la confidentialité se règlent dans la passerelle ; le studio ne parle jamais directement à un
  fournisseur d'IA.
