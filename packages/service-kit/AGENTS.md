# Socle des microservices

Journaux JSON (`createLogger`, jamais de donnée sensible), configuration validée au démarrage (`loadConfig`),
validation par les schémas des contrats (`contractValidator`), erreurs RFC 9457 (`problem`,
`ProblemFilter` dans `@atelier/service-kit/nest`), client HTTP avec délai sans reprise (`requestJson` : les
reprises sont faites par le maillage), enveloppe CloudEvents (`toCloudEvent`). À venir : relais de l'outbox
vers NATS JetStream. Ce paquet ne contient aucune règle métier.
