import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserFileSaver } from '../src/platform/download.js';

describe('téléchargement par lien temporaire', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('crée l’URL d’objet, clique un lien nommé, puis libère l’URL après un délai', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:test');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('straight-skirt-v1.pdf');
      expect(this.href).toBe('blob:test');
    });
    const blob = new Blob(['x']);
    browserFileSaver.save(blob, 'straight-skirt-v1.pdf');
    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:test');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
