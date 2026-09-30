export interface Hasher {
  /** Empreinte SHA-256 en hexadécimal. */
  sha256(text: string): string;
}
