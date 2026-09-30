/** Identifiant typé par entité : un OrderId ne peut pas être passé là où un RollId est attendu. */
export type Id<Entity extends string> = string & { readonly __entity: Entity };

// Web Crypto, présent dans les navigateurs et dans Node : le noyau ne dépend d'aucune plateforme.
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

export interface IdGenerator {
  next<Entity extends string>(): Id<Entity>;
}

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** UUID v7 (RFC 9562) : 48 bits d'horodatage en millisecondes, puis 74 bits aléatoires. */
export function uuidV7(timestampMs: number, random: Uint8Array): string {
  if (random.length < 10) throw new RangeError('uuidV7 attend au moins 10 octets aléatoires');
  const bytes = new Uint8Array(16);
  let ts = BigInt(timestampMs);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(ts & 0xffn);
    ts >>= 8n;
  }
  bytes.set(random.subarray(0, 10), 6);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70; // version 7
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante RFC
  const h = hex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

/** Générateur par défaut : horloge système et hasard cryptographique. */
export const systemIdGenerator: IdGenerator = {
  next<Entity extends string>(): Id<Entity> {
    return uuidV7(Date.now(), crypto.getRandomValues(new Uint8Array(10))) as Id<Entity>;
  },
};
