// Resolve o vencedor de um confronto KO (jogo único ou ida+volta).
// `legs` é um array de partidas ordenadas (legOrdem 1, 2…). Cada leg tem:
//   mandanteId, visitanteId, golsMandante, golsVisitante, status,
//   prorrogacao, golsMandanteProrr, golsVisitanteProrr,
//   penaltisMandante, penaltisVisitante.
// Retorna { vencedorId, agregado:{mandante, visitante}, decidido } ou null se
// faltam dados pra decidir.

export function resolverConfronto(legs) {
  if (!legs?.length) return null;

  // Se há BYE (visitante ou mandante null em qualquer leg), vencedor é o time presente.
  for (const l of legs) {
    if (l.visitanteId == null && l.mandanteId != null) {
      return { vencedorId: l.mandanteId, agregado: null, decidido: 'BYE' };
    }
    if (l.mandanteId == null && l.visitanteId != null) {
      return { vencedorId: l.visitanteId, agregado: null, decidido: 'BYE' };
    }
  }

  // Todas as legs precisam estar concluídas.
  if (legs.some((l) => l.status !== 'CONCLUIDA')) return null;

  // Perspectiva: times da PRIMEIRA leg (ida). Soma agregado considerando que
  // na volta mandante/visitante invertem.
  const timeA = legs[0].mandanteId;
  const timeB = legs[0].visitanteId;
  let agA = 0;
  let agB = 0;
  for (const l of legs) {
    const gm = l.golsMandante ?? 0;
    const gv = l.golsVisitante ?? 0;
    if (l.mandanteId === timeA) {
      agA += gm;
      agB += gv;
    } else {
      agA += gv;
      agB += gm;
    }
  }

  if (agA !== agB) {
    return {
      vencedorId: agA > agB ? timeA : timeB,
      agregado: { [timeA]: agA, [timeB]: agB },
      decidido: 'AGREGADO',
    };
  }

  // Empate no agregado — última leg decide via prorrogação e/ou pênaltis.
  const ultima = legs[legs.length - 1];

  // Prorrogação (opcional, depende da config do campeonato).
  if (ultima.prorrogacao) {
    const pm = ultima.golsMandanteProrr ?? 0;
    const pv = ultima.golsVisitanteProrr ?? 0;
    if (pm !== pv) {
      const vencMand = pm > pv;
      const vencedorId = vencMand === (ultima.mandanteId === timeA) ? timeA : timeB;
      return {
        vencedorId,
        agregado: { [timeA]: agA, [timeB]: agB },
        decidido: 'PRORROGACAO',
      };
    }
  }

  // Pênaltis.
  const penM = ultima.penaltisMandante;
  const penV = ultima.penaltisVisitante;
  if (penM != null && penV != null && penM !== penV) {
    const vencMand = penM > penV;
    const vencedorId = vencMand === (ultima.mandanteId === timeA) ? timeA : timeB;
    return {
      vencedorId,
      agregado: { [timeA]: agA, [timeB]: agB },
      decidido: 'PENALTIS',
    };
  }

  // Ainda não há como decidir.
  return null;
}
