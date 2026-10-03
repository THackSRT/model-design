import { err, ok, type Result } from '@atelier/kernel';
import type { ObjectStore, StoredObject } from '../../src/application/ports/object-store.js';

/** Stockage objet en mémoire : les clés lues sont enregistrées ; `failing` simule une panne. */
export class FakeObjectStore implements ObjectStore {
  readonly reads: string[] = [];
  failing = false;
  private readonly objects = new Map<string, Uint8Array>();

  put(key: string, bytes: Uint8Array): void {
    this.objects.set(key, bytes);
  }

  async get(key: string): Promise<Result<StoredObject, { kind: 'storage-unavailable' }>> {
    this.reads.push(key);
    const bytes = this.objects.get(key);
    if (this.failing || !bytes) return err({ kind: 'storage-unavailable' });
    return ok({
      sizeBytes: bytes.length,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    });
  }
}
