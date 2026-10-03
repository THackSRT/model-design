import { describe, expect, it } from 'vitest';
import { armUnsavedGuard } from '../src/platform/unsaved-guard.js';

const leave = (): boolean => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('avertissement avant de quitter la page', () => {
  it('ne fait rien tant qu’il n’est pas armé', () => {
    expect(leave()).toBe(false);
  });

  it('armé, il demande confirmation ; désarmé, il se tait', () => {
    const disarm = armUnsavedGuard();
    expect(leave()).toBe(true);
    disarm();
    expect(leave()).toBe(false);
  });
});
