# 9. Sécurité, confidentialité et licences

Les mensurations et les photos du corps sont les données les plus sensibles de la plateforme : elles appartiennent au client, sont chiffrées, et chaque accès est autorisé et journalisé.

- **Identité** : connexion par numéro de téléphone et code à usage unique, jetons de courte durée, double facteur pour les propriétaires d'atelier et les administrateurs.
- **Autorisations** : rôles par atelier, vérifiés dans chaque service et en base (sécurité au niveau des lignes) ; un employé ne voit que les commandes qui lui sont attribuées.
- **Partage des mesures** : le client accorde et retire l'accès à un atelier ; les accès sont tracés dans le journal d'audit.
- **Chiffrement** : TLS partout, chiffrement au repos, clés gérées par un service dédié ; champs sensibles chiffrés en plus.
- **Fichiers** : aucune URL publique pour les photos de corps ; URL signées de quelques minutes.
- **IA** : pas d'envoi de photos de corps à un fournisseur externe sans consentement ; préférer un modèle auto-hébergé pour les mesures par photo ; aucune donnée client pour entraîner un modèle tiers.
- **Paiements** : aucune donnée de carte stockée ; webhooks des agrégateurs vérifiés par signature.
- **Conformité** : loi sénégalaise 2008-12, loi ivoirienne 2013-450 et lois équivalentes selon les pays ; RGPD pour les clients européens ; droit d'accès, de rectification et d'effacement.
- **Licences** : registre des composants tiers ; en production seulement MIT, Apache 2.0, BSD et CC0 (MakeHuman, GarmentCode, three.js) ; corps SMPL, SMPL-X et poids non commerciaux exclus ; simulateur NVIDIA Warp sous Apache 2.0 ; licence des poids des modèles d'IA à valider avant usage.
- **Propriété des créations** : chaque modèle garde son auteur, sa licence et son historique ; signalement et retrait en cas de copie.
