import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolverConfronto } from './confronto.js';

const leg = (over) => ({
  status: 'CONCLUIDA',
  mandanteId: 1,
  visitanteId: 2,
  golsMandante: 0,
  golsVisitante: 0,
  prorrogacao: false,
  ...over,
});

describe('resolverConfronto', () => {
  it('jogo único — mandante vence', () => {
    const r = resolverConfronto([leg({ golsMandante: 2, golsVisitante: 1 })]);
    assert.equal(r.vencedorId, 1);
    assert.equal(r.decidido, 'AGREGADO');
  });

  it('BYE — visitante nulo, mandante avança', () => {
    const r = resolverConfronto([leg({ visitanteId: null, status: 'CONCLUIDA' })]);
    assert.equal(r.vencedorId, 1);
    assert.equal(r.decidido, 'BYE');
  });

  it('ida+volta — agregado decide', () => {
    const r = resolverConfronto([
      leg({ golsMandante: 1, golsVisitante: 2 }),
      leg({ mandanteId: 2, visitanteId: 1, golsMandante: 0, golsVisitante: 0 }),
    ]);
    assert.equal(r.vencedorId, 2);
  });

  it('ida+volta empatado — prorrogação na volta decide', () => {
    const r = resolverConfronto([
      leg({ golsMandante: 1, golsVisitante: 1 }),
      leg({
        mandanteId: 2,
        visitanteId: 1,
        golsMandante: 0,
        golsVisitante: 0,
        prorrogacao: true,
        golsMandanteProrr: 1,
        golsVisitanteProrr: 0,
      }),
    ]);
    assert.equal(r.vencedorId, 2);
    assert.equal(r.decidido, 'PRORROGACAO');
  });

  it('ida+volta empatado — vai pros pênaltis', () => {
    const r = resolverConfronto([
      leg({ golsMandante: 1, golsVisitante: 1 }),
      leg({
        mandanteId: 2,
        visitanteId: 1,
        golsMandante: 2,
        golsVisitante: 2,
        penaltisMandante: 4,
        penaltisVisitante: 5,
      }),
    ]);
    // Agregado time1=3, time2=3. Pênaltis: mandante(2)=4, visitante(1)=5 → time 1.
    assert.equal(r.vencedorId, 1);
    assert.equal(r.decidido, 'PENALTIS');
  });

  it('jogo único empatado sem prorr/pênaltis — não decidido', () => {
    const r = resolverConfronto([leg({ golsMandante: 1, golsVisitante: 1 })]);
    assert.equal(r, null);
  });
});
