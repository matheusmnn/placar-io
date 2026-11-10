import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pontosCorridos, mataMataPrimeiraFase, proximaPotenciaDeDois } from './chaveamento.js';

describe('chaveamento', () => {
  it('pontos corridos com 4 times gera 6 partidas em ida', () => {
    const res = pontosCorridos(4, false);
    assert.equal(res.length, 6);
    assert.equal(Math.max(...res.map((c) => c.rodada)), 3);
  });

  it('pontos corridos com 4 times ida+volta gera 12 partidas', () => {
    assert.equal(pontosCorridos(4, true).length, 12);
  });

  it('pontos corridos com 5 times (ímpar) ignora BYE', () => {
    const res = pontosCorridos(5, false);
    // 5 times com bye: 5 rodadas × 2 partidas reais = 10
    assert.equal(res.length, 10);
    assert.ok(res.every((c) => c.mandante >= 0 && c.visitante >= 0));
  });

  it('mata-mata com 5 times completa pra 8 com BYEs', () => {
    const fase = mataMataPrimeiraFase(5);
    assert.equal(fase.length, 4);
    const comBye = fase.filter((c) => c.mandante === -1 || c.visitante === -1);
    assert.equal(comBye.length, 3);
  });

  it('proxima potencia de dois', () => {
    assert.equal(proximaPotenciaDeDois(1), 1);
    assert.equal(proximaPotenciaDeDois(5), 8);
    assert.equal(proximaPotenciaDeDois(8), 8);
    assert.equal(proximaPotenciaDeDois(9), 16);
  });
});
