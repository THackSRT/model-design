import { connect, type ConnectionOptions, type NatsConnection } from '@nats-io/transport-node';

export type { NatsConnection };

/**
 * Options de connexion des services : reconnexion sans limite après une coupure (un service ne renonce
 * jamais à son bus), échec immédiat à la première connexion (l'appelant décide de réessayer).
 */
export function natsConnectionOptions(url: string, name: string): ConnectionOptions {
  return { servers: url, name, maxReconnectAttempts: -1 };
}

/** Seul point d'ouverture d'une connexion NATS (ADR 0008) : les services n'importent pas le client. */
export function connectNats(url: string, name: string): Promise<NatsConnection> {
  return connect(natsConnectionOptions(url, name));
}
