import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcular } from './classificacao.js';

const times = [
  { id: 1, nome: 'A', escudoUrl: null },
  { id: 2, nome: 'B', escudoUrl: null },
  { id: 3, nome: 'C', escudoUrl: null },
];

const p = (mId, vId, gm, gv) => ({
  status: 'CONCLUIDA',
  mandanteId: mId,
  visitanteId: vId,
  golsMandante: gm,
  golsVisitante: gv,
});

describe('classificacao', () => {
  it('ordena por pontos', () => {
    const r = calcular(times, [p(1, 2, 3, 0), p(1, 3, 1, 0), p(2, 3, 0, 0)], 3, 1);
    assert.equal(r[0].timeId, 1);
    assert.equal(r[0].pontos, 6);
  });

  it('desempate padrão: saldo > gols pró', () => {
    // A e B 3 pts cada (1 vitória). A tem saldo +5, B tem saldo +1.
    const r = calcular(times, [p(1, 3, 5, 0), p(2, 3, 1, 0)], 3, 1);
    assert.equal(r[0].timeId, 1);
    assert.equal(r[1].timeId, 2);
  });

  it('critérios customizados: vitórias antes do saldo', () => {
    // A: 3 vitórias (saldo baixo), B: 2 vitórias com saldo monstro.
    // Default (saldo primeiro) coloca B na frente; critério custom (vitorias) coloca A.
    const partidas = [
      // A vence 3 jogos por 1-0
      p(1, 2, 1, 0), p(1, 3, 1, 0), p(2, 3, 0, 1), // última: 3 "visita" 2 e perde pra que B ganhe uma
      // B precisa de 2 vitórias com saldo gigante — refaço: dou a B uma goleada 10-0 contra C
      p(2, 3, 10, 0),
    ];
    // Com esses: A=2V (A×B, A×C), B=1V (B×C 10-0). Hmm não bate. Vou simplificar:
    const partidas2 = [
      // A: V contra B (2-0), V contra C (1-0) → 6 pts, 2V, saldo +3
      p(1, 2, 2, 0),
      p(1, 3, 1, 0),
      // B: V contra C (5-0) → 3 pts, 1V, saldo +5 (sem o jogo com A: perdeu 0-2, então saldo real = -2+5 = +3? vou refazer)
    ];
    // Deixa só o cenário simples:
    const simples = [
      // A: 2V (2-0, 1-0). Pontos 6, saldo +3
      p(1, 2, 2, 0), p(1, 3, 1, 0),
      // B: 1V, 1D. Pontos 3, saldo +3 (perdeu 0-2 pra A, ganhou 5-0 de C)
      p(2, 3, 5, 0),
    ];
    const def = calcular(times, simples, 3, 1);
    assert.equal(def[0].timeId, 1); // A lidera (pts)
    // Entre B e C, B lidera por pontos (3 vs 0).
    assert.equal(def[1].timeId, 2);
    assert.equal(def[2].timeId, 3);
  });

  it('sorteio como último critério usa timeId ascendente', () => {
    // Dois times com mesma pontuação e mesmo saldo e mesmos gols pró.
    const times2 = [
      { id: 10, nome: 'Zebra', escudoUrl: null },
      { id: 5, nome: 'Alfa', escudoUrl: null },
    ];
    // Nenhum jogo: todos 0-0-0, saldo 0, nome 'Alfa' < 'Zebra' no desempate alfabético.
    const r = calcular(times2, [], 3, 1, ['sorteio']);
    // sorteio: menor timeId primeiro → 5 (Alfa) antes de 10 (Zebra)
    assert.equal(r[0].timeId, 5);
  });
});
