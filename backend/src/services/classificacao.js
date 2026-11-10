const CRITERIOS_PADRAO = ['saldo', 'golsPro'];

const COMPARADORES = {
  saldo: (a, b) => b.golsPro - b.golsContra - (a.golsPro - a.golsContra),
  golsPro: (a, b) => b.golsPro - a.golsPro,
  golsContra: (a, b) => a.golsContra - b.golsContra,
  vitorias: (a, b) => b.vitorias - a.vitorias,
  sorteio: (a, b) => a.time.id - b.time.id, // determinístico
};

export function calcular(times, partidas, pontosVitoria, pontosEmpate, criteriosDesempate) {
  const criterios = (Array.isArray(criteriosDesempate) && criteriosDesempate.length > 0
    ? criteriosDesempate
    : CRITERIOS_PADRAO
  ).filter((c) => COMPARADORES[c]);

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
  }

  const linhas = [...tabela.values()];
  linhas.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    for (const c of criterios) {
      const d = COMPARADORES[c](a, b);
      if (d !== 0) return d;
    }
    return a.time.nome.localeCompare(b.time.nome, 'pt', { sensitivity: 'base' });
  });

  return linhas.map((l, i) => ({
    posicao: i + 1,
    timeId: l.time.id,
    nome: l.time.nome,
    escudoUrl: l.time.escudoUrl,
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

export const CRITERIOS_DISPONIVEIS = Object.keys(COMPARADORES);
