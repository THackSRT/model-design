import { errorName, type Logger } from './logger.js';
import type { TaskMessage } from './handler.js';

/** Partie d'un message JetStream utilisée ici (remplaçable par une doublure dans les tests). */
export interface AckableMessage extends TaskMessage {
  ack(): void;
  nak(delayMs?: number): void;
}

/**
 * Boucle de traitement : un message à la fois. Résolu, le gestionnaire fait acquitter le message ; rejeté, il est
 * renvoyé après `retryDelayMs` (`nak`), jamais acquitté. Seuls le sujet et le nom de l'erreur sont journalisés.
 */
export async function processMessages(
  messages: AsyncIterable<AckableMessage>,
  handler: (message: TaskMessage) => Promise<void>,
  options: { logger: Logger; retryDelayMs: number },
): Promise<void> {
  for await (const message of messages) {
    try {
      await handler(message);
      message.ack();
    } catch (error) {
      options.logger.log('error', 'consumer.handler-failed', {
        subject: message.subject,
        errorName: errorName(error),
      });
      message.nak(options.retryDelayMs);
    }
  }
}
