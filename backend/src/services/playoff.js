// Constrói o chaveamento do playoff a partir da classificação final da fase
// regular e da config do campeonato.
//
// `classificacao`: [{ posicao, timeId, ... }] já ordenada
// `config`: { posicoes: [3,4,5,6], chaveamento: [[3,6],[4,5]], temFinal, idaVolta, desempate }
// Retorna: { confrontos: [{mandanteId, visitanteId, ordemFase}], temFinal, idaVolta, desempate }
export function construirPlayoff(classificacao, config) {
  if (!config || !Array.isArray(config.chaveamento) || config.chaveamento.length === 0) {
    throw new Error('Config de playoff inválida (sem chaveamento)');
  }
  const porPosicao = new Map(classificacao.map((l) => [l.posicao, l.timeId]));
  const confrontos = config.chaveamento.map(([p1, p2], i) => {
    const mandanteId = porPosicao.get(p1);
    const visitanteId = porPosicao.get(p2);
    if (mandanteId == null || visitanteId == null) {
      throw new Error(`Posição ${mandanteId == null ? p1 : p2} não existe na classificação`);
    }
    return { mandanteId, visitanteId, ordemFase: i };
  });
  return {
    confrontos,
    temFinal: config.temFinal !== false,
    idaVolta: config.idaVolta === true,
    desempate: config.desempate ?? 'PENALTIS',
  };
}

export const PLAYOFF_PADRAO_PCMM = {
  // Top 4 clássico: 1×4, 2×3, final.
  posicoes: [1, 2, 3, 4],
  chaveamento: [
    [1, 4],
    [2, 3],
  ],
  temFinal: true,
  idaVolta: false,
  desempate: 'PENALTIS',
};
