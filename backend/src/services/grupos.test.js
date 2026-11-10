import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { emparelhamentoCross } from './grupos.js';

describe('emparelhamentoCross', () => {
  it('2 grupos × 2 classificados = 2 confrontos cruzados', () => {
    // A: [1A, 2A], B: [1B, 2B]
    const c = emparelhamentoCross([
      ['1A', '2A'],
      ['1B', '2B'],
    ]);
    assert.deepEqual(c, [
      { mandanteId: '1A', visitanteId: '2B' },
      { mandanteId: '2A', visitanteId: '1B' },
    ]);
  });

  it('4 grupos × 2 classificados = 4 confrontos (2 por par)', () => {
    const c = emparelhamentoCross([
      ['1A', '2A'],
      ['1B', '2B'],
      ['1C', '2C'],
      ['1D', '2D'],
    ]);
    assert.equal(c.length, 4);
    assert.deepEqual(c[0], { mandanteId: '1A', visitanteId: '2B' });
    assert.deepEqual(c[2], { mandanteId: '1C', visitanteId: '2D' });
  });

  it('número ímpar de grupos lança erro', () => {
    assert.throws(() => emparelhamentoCross([['1A'], ['1B'], ['1C']]));
  });
});
