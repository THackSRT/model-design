import { createHash } from 'node:crypto';
import type { Hasher } from '../../application/ports/hasher.js';

export const nodeHasher: Hasher = {
  sha256: (text) => createHash('sha256').update(text, 'utf8').digest('hex'),
};
