export { connectNats, type NatsConnection, natsConnectionOptions } from './connect.js';
export { ensureStream, type StreamDeclaration } from './ensure-stream.js';
export {
  deleteStreamEvent,
  describeStream,
  lastStreamEvent,
  type StoredEvent,
  type StreamSummary,
} from './inspect.js';
export { JetStreamPublisher } from './jetstream-publisher.js';
