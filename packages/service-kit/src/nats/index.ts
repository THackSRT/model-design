export { connectNats, type NatsConnection, natsConnectionOptions } from './connect.js';
export { ensureStream, type StreamDeclaration, type StreamRetention } from './ensure-stream.js';
export {
  deleteStreamEvent,
  describeStream,
  lastStreamEvent,
  type StoredEvent,
  type StreamSummary,
} from './inspect.js';
export { JetStreamPublisher } from './jetstream-publisher.js';
export {
  type AckableMessage,
  type ConsumedMessage,
  type ConsumerDeclaration,
  type MessageHandler,
  processMessages,
  type RunningConsumer,
  startJetStreamConsumer,
} from './jetstream-consumer.js';
