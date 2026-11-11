const CRITERIOS_PADRAO = ['saldo', 'golsPro'];

const COMPARADORES = {
  saldo: (a, b) => (b.golsPro - b.golsContra) - (a.golsPro - a.golsContra),
  golsPro: (a, b) => b.golsPro - a.golsPro,
  golsContra: (a, b) => a.golsContra - b.golsContra,
  vitorias: (a, b) => b.vitorias - a.vitorias,
  cartoesVermelhos: (a, b) => a.cartoesVermelhos - b.cartoesVermelhos,
  cartoesAmarelos: (a, b) => a.cartoesAmarelos - b.cartoesAmarelos,
  sorteio: (a, b) => a.time.id - b.time.id,
};

export function calcular(times, partidas, pontosVitoria, pontosEmpate, criteriosDesempate) {
  const criterios = (Array.isArray(criteriosDesempate) && criteriosDesempate.length > 0
    ? criteriosDesempate
    : CRITERIOS_PADRAO
  ).filter((c) => c === 'confrontoDireto' || COMPARADORES[c]);

  const tabela = new Map();
  for (const t of times) {
    tabela.set(t.id, {
      time: t,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
    });
  }

  for (const p of partidas) {
    if (p.status !== 'CONCLUIDA') continue;
    if (p.mandanteId == null || p.visitanteId == null) continue;
    if (p.golsMandante == null || p.golsVisitante == null) continue;

    const m = tabela.get(p.mandanteId);
    const v = tabela.get(p.visitanteId);
    if (!m || !v) continue;

    const gm = p.golsMandante;
    const gv = p.golsVisitante;
    m.jogos++;
    v.jogos++;
    m.golsPro += gm;
    m.golsContra += gv;
    v.golsPro += gv;
    v.golsContra += gm;

    if (gm > gv) {
      m.vitorias++;
      m.pontos += pontosVitoria;
      v.derrotas++;
    } else if (gm < gv) {
      v.vitorias++;
      v.pontos += pontosVitoria;
      m.derrotas++;
    } else {
      m.empates++;
      v.empates++;
      m.pontos += pontosEmpate;
      v.pontos += pontosEmpate;
    }

    // Cartões — só contabilizam se o caller incluir no query (include: { cartoes }).
    if (Array.isArray(p.cartoes)) {
      for (const c of p.cartoes) {
        const alvo = tabela.get(c.timeId);
        if (!alvo) continue;
        if (c.tipo === 'AMARELO') alvo.cartoesAmarelos++;
        else if (c.tipo === 'VERMELHO') alvo.cartoesVermelhos++;
      }
    }
  }

  const linhas = [...tabela.values()];
  const partidasPorPar = indexarPartidasPorPar(partidas);
  const ordenadas = refinarCluster(
    linhas,
    ['__pontos__', ...criterios],
    0,
    partidasPorPar,
    pontosVitoria,
    pontosEmpate,
  );

  return ordenadas.map((l, i) => ({
    posicao: i + 1,
    timeId: l.time.id,
    nome: l.time.nome,
    escudoUrl: l.time.escudoUrl,
    cor: l.time.cor ?? null,
    abreviacao: l.time.abreviacao ?? null,
    pontos: l.pontos,
    jogos: l.jogos,
    vitorias: l.vitorias,
    empates: l.empates,
    derrotas: l.derrotas,
    golsPro: l.golsPro,
    golsContra: l.golsContra,
    saldo: l.golsPro - l.golsContra,
  }));
}

// Sort cluster-aware: aplica cada critério no cluster atual e divide em sub-clusters
// pros empatados, recursivo. Confronto direto precisa do cluster inteiro (mini-tabela).
function refinarCluster(cluster, chain, idx, partidasPorPar, pV, pE) {
  if (cluster.length <= 1 || idx >= chain.length) {
    cluster.sort((a, b) => a.time.nome.localeCompare(b.time.nome, 'pt', { sensitivity: 'base' }));
    return cluster;
  }
  const c = chain[idx];
  let cmp;
  if (c === 'confrontoDireto' && cluster.length >= 2) {
    const mini = miniTabela(cluster.map((l) => l.time.id), partidasPorPar, pV, pE);
    cmp = (a, b) => {
      const sa = mini.get(a.time.id);
      const sb = mini.get(b.time.id);
      if (sb.pontos !== sa.pontos) return sb.pontos - sa.pontos;
      return sb.saldo - sa.saldo;
    };
  } else if (c === '__pontos__') {
    cmp = (a, b) => b.pontos - a.pontos;
  } else {
    cmp = COMPARADORES[c];
  }
  cluster.sort(cmp);
  const out = [];
  let i = 0;
  while (i < cluster.length) {
    let j = i + 1;
    while (j < cluster.length && cmp(cluster[i], cluster[j]) === 0) j++;
    out.push(...refinarCluster(cluster.slice(i, j), chain, idx + 1, partidasPorPar, pV, pE));
    i = j;
  }
  return out;
}

function parKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function indexarPartidasPorPar(partidas) {
  const idx = new Map();
  for (const p of partidas) {
    if (p.status !== 'CONCLUIDA') continue;
    if (p.mandanteId == null || p.visitanteId == null) continue;
    if (p.golsMandante == null || p.golsVisitante == null) continue;
    const key = parKey(p.mandanteId, p.visitanteId);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(p);
  }
  return idx;
}

function miniTabela(ids, partidasPorPar, pV, pE) {
  const stats = new Map();
  for (const id of ids) stats.set(id, { pontos: 0, golsPro: 0, golsContra: 0, saldo: 0 });
  const set = new Set(ids);
  const seen = new Set();
  for (const id1 of ids) {
    for (const id2 of ids) {
      if (id1 === id2) continue;
      const key = parKey(id1, id2);
      if (seen.has(key)) continue;
      seen.add(key);
      const ps = partidasPorPar.get(key) ?? [];
      for (const p of ps) {
        if (!set.has(p.mandanteId) || !set.has(p.visitanteId)) continue;
        const sm = stats.get(p.mandanteId);
        const sv = stats.get(p.visitanteId);
        sm.golsPro += p.golsMandante;
        sm.golsContra += p.golsVisitante;
        sv.golsPro += p.golsVisitante;
        sv.golsContra += p.golsMandante;
        if (p.golsMandante > p.golsVisitante) sm.pontos += pV;
        else if (p.golsMandante < p.golsVisitante) sv.pontos += pV;
        else { sm.pontos += pE; sv.pontos += pE; }
      }
    }
  }
  for (const s of stats.values()) s.saldo = s.golsPro - s.golsContra;
  return stats;
}

export const CRITERIOS_DISPONIVEIS = [...Object.keys(COMPARADORES), 'confrontoDireto'];
