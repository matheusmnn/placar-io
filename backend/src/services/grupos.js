// Emparelha os classificados de grupos em confrontos cross-group.
// `classificacoesPorGrupo` é um array de arrays de timeId, cada sub-array
// ordenado por posição final (índice 0 = primeiro colocado). Todos os
// sub-arrays têm o mesmo tamanho N (= avancamPorGrupo).
//
// Regra: grupos se emparelham 2 a 2 na ordem recebida (G1-G2, G3-G4…).
// Para cada par (Ga, Gb) e i em [0, N): gera (Ga[i] × Gb[N-1-i]).
// Resultado: Ga[0]×Gb[N-1], Ga[1]×Gb[N-2], … Ga[N-1]×Gb[0], depois próximo par.
// Shortcut: não implementa seeding tipo Copa do Mundo (melhor × pior global);
// upgrade quando a Fatia 4 trouxer playoff dinâmico.
export function emparelhamentoCross(classificacoesPorGrupo) {
  if (classificacoesPorGrupo.length % 2 !== 0) {
    throw new Error('GRUPOS_MATA_MATA exige número par de grupos');
  }
  const N = classificacoesPorGrupo[0].length;
  if (!classificacoesPorGrupo.every((g) => g.length === N)) {
    throw new Error('Todos os grupos precisam ter o mesmo número de classificados');
  }
  const confrontos = [];
  for (let p = 0; p < classificacoesPorGrupo.length; p += 2) {
    const ga = classificacoesPorGrupo[p];
    const gb = classificacoesPorGrupo[p + 1];
    for (let i = 0; i < N; i++) {
      confrontos.push({ mandanteId: ga[i], visitanteId: gb[N - 1 - i] });
    }
  }
  return confrontos;
}
