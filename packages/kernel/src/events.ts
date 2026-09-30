/** Événement du domaine, avant son enveloppe CloudEvents : un type, un sujet, des faits. */
export interface DomainEvent<Data extends object = object> {
  readonly type: string;
  readonly subject: string;
  readonly data: Data;
}
