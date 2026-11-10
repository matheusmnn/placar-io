import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { construirPlayoff } from './playoff.js';

const classificacao = [
  { posicao: 1, timeId: 10 },
  { posicao: 2, timeId: 20 },
  { posicao: 3, timeId: 30 },
  { posicao: 4, timeId: 40 },
  { posicao: 5, timeId: 50 },
  { posicao: 6, timeId: 60 },
];

describe('construirPlayoff', () => {
  it('estilo Série A (top 4, com final)', () => {
    const r = construirPlayoff(classificacao, {
      posicoes: [1, 2, 3, 4],
      chaveamento: [[1, 4], [2, 3]],
      temFinal: true,
    });
    assert.equal(r.confrontos.length, 2);
    assert.deepEqual(r.confrontos[0], { mandanteId: 10, visitanteId: 40, ordemFase: 0 });
    assert.deepEqual(r.confrontos[1], { mandanteId: 20, visitanteId: 30, ordemFase: 1 });
    assert.equal(r.temFinal, true);
  });

  it('estilo acesso Série B (3×6, 4×5, sem final — ambos vencedores sobem)', () => {
    const r = construirPlayoff(classificacao, {
      posicoes: [3, 4, 5, 6],
      chaveamento: [[3, 6], [4, 5]],
      temFinal: false,
    });
    assert.deepEqual(r.confrontos.map((c) => [c.mandanteId, c.visitanteId]), [
      [30, 60],
      [40, 50],
    ]);
    assert.equal(r.temFinal, false);
  });

  it('posição inexistente lança erro', () => {
    assert.throws(() =>
      construirPlayoff(classificacao, {
        chaveamento: [[1, 99]],
      }),
    );
  });
});
