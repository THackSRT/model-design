# 2. Diagramme global du système

![Architecture globale : 7 couches, 16 services, 7 moteurs](../assets/diagrams/architecture-globale.png)

Les applications passent toutes par la passerelle ; les services métier appellent directement les moteurs rapides (mannequin, patronage) et confient le calcul lourd à la file ; la fin de chaque tâche revient par le bus d'événements. Les services Paiements, Messagerie et le moteur IA sont les seuls à parler aux services externes (flèche pointillée). Les vendeurs de tissus et les prestataires ont leur propre application, branchée sur les mêmes services : leur stock, leurs ventes et leurs prestations passent par les mêmes événements que les commandes des ateliers, et le moteur Tissu numérique rend leurs tissus visibles sur le patron et sur le mannequin.
