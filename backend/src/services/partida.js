import { prisma } from '../lib/prisma.js';
import { badRequest } from '../lib/http.js';
import { pontosCorridos, mataMataPrimeiraFase, proximaPotenciaDeDois, faseLabel, BYE } from './chaveamento.js';
import { resolverConfronto } from './confronto.js';
import { emparelhamentoCross } from './grupos.js';
import { calcular as calcularClassificacao } from './classificacao.js';
import { construirPlayoff, PLAYOFF_PADRAO_PCMM } from './playoff.js';

const FORMATOS_COM_KO = new Set(['MATA_MATA', 'GRUPOS_MATA_MATA', 'PONTOS_CORRIDOS_MATA_MATA']);
const FORMATOS_COM_GRUPOS = new Set(['GRUPOS', 'GRUPOS_MATA_MATA']);

export async function gerarRodadas(campeonatoId) {
  const camp = await prisma.campeonato.findUnique({ where: { id: campeonatoId } });
  if (!camp) throw badRequest('Campeonato não encontrado');
  const inscricoes = await prisma.inscricaoCampeonato.findMany({
    where: { campeonatoId },
    include: { time: true },
    orderBy: { time: { nome: 'asc' } },
  });
  const times = inscricoes.map((i) => i.time);
  if (times.length < 2) throw badRequest('Inscreva pelo menos 2 times antes de gerar as rodadas');

  await prisma.partida.deleteMany({ where: { campeonatoId } });

  if (camp.formato === 'PONTOS_CORRIDOS' || camp.formato === 'PONTOS_CORRIDOS_MATA_MATA') {
    await criarPontosCorridos(camp, times, null);
  } else if (camp.formato === 'MATA_MATA') {
    await criarFaseKO(
      camp,
      1,
      faseLabel(proximaPotenciaDeDois(times.length)),
      mataMataPrimeiraFase(times.length).map((par) => ({
        mandanteId: times[par.mandante].id,
        visitanteId: par.visitante === BYE ? null : times[par.visitante].id,
        ordemFase: par.ordem,
      })),
    );
  } else if (FORMATOS_COM_GRUPOS.has(camp.formato)) {
    await gerarRodadasGrupos(camp);
  } else {
    throw badRequest(`Formato ${camp.formato} não suportado`);
  }

  await prisma.campeonato.update({ where: { id: campeonatoId }, data: { status: 'EM_ANDAMENTO' } });

  if (camp.formato === 'MATA_MATA') await verificarAvancoMataMata(camp, 1);
  if (camp.formato === 'GRUPOS_MATA_MATA') await verificarAvancoGrupos(camp);

  return listarRodadas(campeonatoId);
}

async function criarPontosCorridos(camp, times, grupoId) {
  const confrontos = pontosCorridos(times.length, camp.idaVolta);
  await prisma.partida.createMany({
    data: confrontos.map((c) => ({
      campeonatoId: camp.id,
      mandanteId: times[c.mandante].id,
      visitanteId: times[c.visitante].id,
      rodada: c.rodada,
      grupoId,
    })),
  });
}

async function gerarRodadasGrupos(camp) {
  const grupos = await prisma.grupo.findMany({
    where: { campeonatoId: camp.id },
    orderBy: { nome: 'asc' },
    include: { inscricoes: { include: { time: true } } },
  });
  if (grupos.length === 0) throw badRequest('Crie os grupos antes de gerar as rodadas');
  const gruposComTimes = grupos.map((g) => ({
    ...g,
    times: g.inscricoes.map((i) => i.time).sort((a, b) => a.nome.localeCompare(b.nome)),
  }));
  for (const g of gruposComTimes) {
    if (g.times.length < 2) throw badRequest(`Grupo ${g.nome} precisa de pelo menos 2 times`);
  }
  if (camp.formato === 'GRUPOS_MATA_MATA' && gruposComTimes.length % 2 !== 0) {
    throw badRequest('GRUPOS_MATA_MATA exige número par de grupos');
  }
  for (const g of gruposComTimes) {
    await criarPontosCorridos(camp, g.times, g.id);
  }
}

// Cria uma fase de KO com todos os confrontos (opcionalmente em ida+volta).
// `confrontos` é um array de { mandanteId, visitanteId|null (bye), ordemFase }.
async function criarFaseKO(camp, rodada, label, confrontos) {
  for (const c of confrontos) {
    const bye = c.visitanteId == null;
    if (bye) {
      await prisma.partida.create({
        data: {
          campeonatoId: camp.id,
          mandanteId: c.mandanteId,
          visitanteId: null,
          rodada,
          fase: label,
          ordemFase: c.ordemFase,
          legOrdem: null,
          status: 'CONCLUIDA',
        },
      });
      continue;
    }
    if (camp.idaVolta) {
      await prisma.partida.create({
        data: {
          campeonatoId: camp.id,
          mandanteId: c.mandanteId,
          visitanteId: c.visitanteId,
          rodada,
          fase: label,
          ordemFase: c.ordemFase,
          legOrdem: 1,
        },
      });
      await prisma.partida.create({
        data: {
          campeonatoId: camp.id,
          mandanteId: c.visitanteId,
          visitanteId: c.mandanteId,
          rodada,
          fase: label,
          ordemFase: c.ordemFase,
          legOrdem: 2,
        },
      });
    } else {
      await prisma.partida.create({
        data: {
          campeonatoId: camp.id,
          mandanteId: c.mandanteId,
          visitanteId: c.visitanteId,
          rodada,
          fase: label,
          ordemFase: c.ordemFase,
          legOrdem: null,
        },
      });
    }
  }
}

export async function registrarResultado(partidaId, req) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: { campeonato: true },
  });
  if (!p) throw badRequest('Partida não encontrada');
  if (p.mandanteId == null || p.visitanteId == null) throw badRequest('Essa partida não pode receber resultado');

  const mataMata = ehPartidaKO(p, p.campeonato);

  // Monta a partida "simulada" (como ficaria após a gravação) pra validar.
  const partidaSimulada = {
    ...p,
    golsMandante: req.golsMandante,
    golsVisitante: req.golsVisitante,
    status: 'CONCLUIDA',
    prorrogacao: req.prorrogacao ?? false,
    golsMandanteProrr: req.golsMandanteProrr ?? null,
    golsVisitanteProrr: req.golsVisitanteProrr ?? null,
    penaltisMandante: req.penaltisMandante ?? null,
    penaltisVisitante: req.penaltisVisitante ?? null,
  };

  if (mataMata) {
    const legs = await legsDoConfronto(p, partidaSimulada);
    const outraLegPendente = legs.some((l) => l.id !== p.id && l.status !== 'CONCLUIDA');
    if (!outraLegPendente) {
      // Esta é a última leg: resultado precisa decidir o confronto.
      const r = resolverConfronto(legs);
      if (!r) throw badRequest(mensagemDesempate(p.campeonato.koDesempate));
    }
  }

  const golsNovos = await validarGols(p, req);
  const cartoesNovos = await validarCartoes(p, req);

  await prisma.$transaction([
    prisma.gol.deleteMany({ where: { partidaId } }),
    prisma.cartao.deleteMany({ where: { partidaId } }),
    prisma.partida.update({
      where: { id: partidaId },
      data: {
        golsMandante: req.golsMandante,
        golsVisitante: req.golsVisitante,
        prorrogacao: req.prorrogacao ?? false,
        golsMandanteProrr: req.golsMandanteProrr ?? null,
        golsVisitanteProrr: req.golsVisitanteProrr ?? null,
        penaltisMandante: req.penaltisMandante ?? null,
        penaltisVisitante: req.penaltisVisitante ?? null,
        status: 'CONCLUIDA',
      },
    }),
    prisma.gol.createMany({ data: golsNovos }),
    prisma.cartao.createMany({ data: cartoesNovos }),
  ]);

  if (mataMata) {
    await verificarAvancoMataMata(p.campeonato, p.rodada);
  } else if (p.campeonato.formato === 'GRUPOS_MATA_MATA') {
    await verificarAvancoGrupos(p.campeonato);
  } else if (p.campeonato.formato === 'PONTOS_CORRIDOS_MATA_MATA') {
    await verificarAvancoPlayoff(p.campeonato);
  } else {
    await verificarEncerramento(p.campeonatoId);
  }

  return detalhe(partidaId);
}

function ehPartidaKO(partida, camp) {
  if (camp.formato === 'MATA_MATA') return true;
  if (camp.formato === 'GRUPOS_MATA_MATA' && partida.grupoId == null) return true;
  if (camp.formato === 'PONTOS_CORRIDOS_MATA_MATA' && partida.fase != null) return true;
  return false;
}

// Fecha a partida com o placar final. Diferente de registrarResultado, NÃO
// toca em gols/cartões já registrados (que vieram por CRUD granular).
export async function fecharPlacar(partidaId, req) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: { campeonato: true },
  });
  if (!p) throw badRequest('Partida não encontrada');
  if (p.mandanteId == null || p.visitanteId == null) throw badRequest('Essa partida não pode receber resultado');

  const mataMata = ehPartidaKO(p, p.campeonato);
  const partidaSimulada = {
    ...p,
    golsMandante: req.golsMandante,
    golsVisitante: req.golsVisitante,
    status: 'CONCLUIDA',
    prorrogacao: req.prorrogacao ?? false,
    golsMandanteProrr: req.golsMandanteProrr ?? null,
    golsVisitanteProrr: req.golsVisitanteProrr ?? null,
    penaltisMandante: req.penaltisMandante ?? null,
    penaltisVisitante: req.penaltisVisitante ?? null,
  };

  if (mataMata) {
    const legs = await legsDoConfronto(p, partidaSimulada);
    const outraLegPendente = legs.some((l) => l.id !== p.id && l.status !== 'CONCLUIDA');
    if (!outraLegPendente) {
      const r = resolverConfronto(legs);
      if (!r) throw badRequest(mensagemDesempate(p.campeonato.koDesempate));
    }
  }

  await prisma.partida.update({
    where: { id: partidaId },
    data: {
      golsMandante: req.golsMandante,
      golsVisitante: req.golsVisitante,
      prorrogacao: req.prorrogacao ?? false,
      golsMandanteProrr: req.golsMandanteProrr ?? null,
      golsVisitanteProrr: req.golsVisitanteProrr ?? null,
      penaltisMandante: req.penaltisMandante ?? null,
      penaltisVisitante: req.penaltisVisitante ?? null,
      status: 'CONCLUIDA',
    },
  });

  if (mataMata) await verificarAvancoMataMata(p.campeonato, p.rodada);
  else if (p.campeonato.formato === 'GRUPOS_MATA_MATA') await verificarAvancoGrupos(p.campeonato);
  else if (p.campeonato.formato === 'PONTOS_CORRIDOS_MATA_MATA') await verificarAvancoPlayoff(p.campeonato);
  else await verificarEncerramento(p.campeonatoId);

  return detalhe(partidaId);
}

function mensagemDesempate(ko) {
  return ko === 'PRORROGACAO_PENALTIS'
    ? 'Confronto empatado — informe prorrogação e/ou pênaltis'
    : 'Confronto empatado — informe os pênaltis';
}

async function legsDoConfronto(partidaOriginal, partidaSimulada) {
  // Se não tem legOrdem, é jogo único: só uma leg.
  if (partidaOriginal.legOrdem == null) return [partidaSimulada];
  const outras = await prisma.partida.findMany({
    where: {
      campeonatoId: partidaOriginal.campeonatoId,
      rodada: partidaOriginal.rodada,
      ordemFase: partidaOriginal.ordemFase,
      id: { not: partidaOriginal.id },
    },
  });
  const todas = [...outras, partidaSimulada];
  todas.sort((a, b) => (a.legOrdem ?? 0) - (b.legOrdem ?? 0));
  return todas;
}

async function validarGols(p, req) {
  const gols = req.gols ?? [];
  let mand = 0;
  let vis = 0;
  const data = [];
  for (const gi of gols) {
    const timeId = resolverTime(p, gi.timeId);
    if (timeId === p.mandanteId) mand++;
    else vis++;
    await validarJogador(gi.jogadorId, timeId);
    data.push({ partidaId: p.id, timeId, jogadorId: gi.jogadorId ?? null, minuto: gi.minuto ?? null });
  }
  if (gols.length > 0 && (mand !== req.golsMandante || vis !== req.golsVisitante)) {
    throw badRequest('A quantidade de gols detalhados não bate com o placar informado');
  }
  return data;
}

async function validarCartoes(p, req) {
  const cartoes = req.cartoes ?? [];
  const data = [];
  for (const ci of cartoes) {
    const timeId = resolverTime(p, ci.timeId);
    await validarJogador(ci.jogadorId, timeId);
    data.push({ partidaId: p.id, timeId, jogadorId: ci.jogadorId ?? null, tipo: ci.tipo, minuto: ci.minuto ?? null });
  }
  return data;
}

function resolverTime(p, timeId) {
  if (p.mandanteId === timeId) return p.mandanteId;
  if (p.visitanteId === timeId) return p.visitanteId;
  throw badRequest('O time informado não participa dessa partida');
}

async function validarJogador(jogadorId, timeId) {
  if (jogadorId == null) return;
  const j = await prisma.jogador.findUnique({ where: { id: jogadorId } });
  if (!j) throw badRequest('Jogador não encontrado');
  if (j.timeId !== timeId) throw badRequest('O jogador não pertence ao time informado');
}

async function verificarAvancoMataMata(camp, rodada) {
  const faseAtual = await prisma.partida.findMany({
    where: { campeonatoId: camp.id, rodada, grupoId: null, NOT: { fase: null } },
    orderBy: [{ ordemFase: 'asc' }, { legOrdem: 'asc' }, { id: 'asc' }],
  });
  if (faseAtual.length === 0) return;
  if (!faseAtual.every((p) => p.status === 'CONCLUIDA')) return;

  // Agrupa por ordemFase (um confronto pode ter 1 ou 2 legs).
  const porConfronto = new Map();
  for (const p of faseAtual) {
    const key = p.ordemFase ?? 0;
    if (!porConfronto.has(key)) porConfronto.set(key, []);
    porConfronto.get(key).push(p);
  }

  const vencedores = [];
  for (const [, legs] of [...porConfronto].sort((a, b) => a[0] - b[0])) {
    legs.sort((a, b) => (a.legOrdem ?? 0) - (b.legOrdem ?? 0));
    const r = resolverConfronto(legs);
    if (!r) return; // confronto sem decisão — não avança
    vencedores.push(r.vencedorId);
  }

  if (vencedores.length === 1) {
    await prisma.campeonato.update({ where: { id: camp.id }, data: { status: 'ENCERRADO' } });
    return;
  }

  // Em playoff com temFinal=false, a primeira (e única) fase encerra o campeonato
  // com múltiplos "vencedores" (ex: acesso Série B, onde 2 sobem direto).
  if (camp.playoff && camp.playoff.temFinal === false && faseAtual[0]?.fase?.startsWith('Playoff')) {
    await prisma.campeonato.update({ where: { id: camp.id }, data: { status: 'ENCERRADO' } });
    return;
  }

  const proxima = await prisma.partida.count({
    where: { campeonatoId: camp.id, rodada: rodada + 1, grupoId: null, NOT: { fase: null } },
  });
  if (proxima > 0) return;

  const label = faseLabel(vencedores.length);
  const confrontos = [];
  for (let i = 0; i < vencedores.length / 2; i++) {
    confrontos.push({
      mandanteId: vencedores[2 * i],
      visitanteId: vencedores[2 * i + 1],
      ordemFase: i,
    });
  }
  await criarFaseKO(camp, rodada + 1, label, confrontos);
}

async function verificarAvancoPlayoff(camp) {
  // Se já existe fase de playoff (fase != null), delega ao avanço KO padrão.
  const partidasPlayoff = await prisma.partida.findMany({
    where: { campeonatoId: camp.id, NOT: { fase: null } },
  });
  if (partidasPlayoff.length > 0) {
    const rodadaAtual = Math.max(...partidasPlayoff.map((p) => p.rodada));
    await verificarAvancoMataMata(camp, rodadaAtual);
    return;
  }

  // Fase regular (pontos corridos): só gera playoff quando todas acabarem.
  const partidasPC = await prisma.partida.findMany({
    where: { campeonatoId: camp.id, grupoId: null, fase: null },
    include: { cartoes: { select: { timeId: true, tipo: true } } },
  });
  if (partidasPC.length === 0) return;
  if (!partidasPC.every((p) => p.status === 'CONCLUIDA')) return;

  const inscr = await prisma.inscricaoCampeonato.findMany({ where: { campeonatoId: camp.id }, include: { time: true } });
  const times = inscr.map((i) => i.time);
  const classificacao = calcularClassificacao(
    times,
    partidasPC,
    camp.pontosVitoria,
    camp.pontosEmpate,
    camp.criteriosDesempate,
  );

  const config = camp.playoff ?? PLAYOFF_PADRAO_PCMM;
  const bracket = construirPlayoff(classificacao, config);

  const label = 'Playoff';
  // Aplica idaVolta e desempate do playoff mesmo se forem diferentes do campeonato
  // principal — usamos um "pseudo-camp" com as flags do playoff pra criarFaseKO.
  const campPlayoff = { ...camp, idaVolta: bracket.idaVolta, koDesempate: bracket.desempate };
  await criarFaseKO(campPlayoff, 1, label, bracket.confrontos);
  await verificarAvancoMataMata(camp, 1);
}

async function verificarAvancoGrupos(camp) {
  // Se já existem partidas de KO (grupoId null) nesse campeonato, delega a
  // progressão pro avanço KO normal.
  const partidasKO = await prisma.partida.findMany({
    where: { campeonatoId: camp.id, grupoId: null },
  });
  if (partidasKO.length > 0) {
    const rodadaAtual = Math.max(...partidasKO.map((p) => p.rodada));
    await verificarAvancoMataMata(camp, rodadaAtual);
    return;
  }

  // Ainda estamos na fase de grupos — só gera KO quando todas as partidas de
  // grupos estiverem concluídas.
  const partidasGrupo = await prisma.partida.findMany({
    where: { campeonatoId: camp.id, NOT: { grupoId: null } },
    include: { cartoes: { select: { timeId: true, tipo: true } } },
  });
  if (partidasGrupo.length === 0) return;
  if (!partidasGrupo.every((p) => p.status === 'CONCLUIDA')) return;

  // Classificação final por grupo.
  const grupos = await prisma.grupo.findMany({
    where: { campeonatoId: camp.id },
    orderBy: { nome: 'asc' },
    include: { inscricoes: { include: { time: true } } },
  });
  const N = camp.avancamPorGrupo ?? 2;
  const classificacoes = [];
  for (const g of grupos) {
    const times = g.inscricoes.map((i) => i.time);
    const partidas = partidasGrupo.filter((p) => p.grupoId === g.id);
    const linhas = calcularClassificacao(
      times,
      partidas,
      camp.pontosVitoria,
      camp.pontosEmpate,
      camp.criteriosDesempate,
    );
    classificacoes.push(linhas.slice(0, N).map((l) => l.timeId));
  }

  const confrontos = emparelhamentoCross(classificacoes).map((c, i) => ({
    mandanteId: c.mandanteId,
    visitanteId: c.visitanteId,
    ordemFase: i,
  }));
  const totalTimes = confrontos.length * 2;
  const label = faseLabel(totalTimes);
  await criarFaseKO(camp, 1, label, confrontos);
  await verificarAvancoMataMata(camp, 1);
}

async function verificarEncerramento(campeonatoId) {
  const todas = await prisma.partida.findMany({ where: { campeonatoId } });
  const todasConcluidas = todas.length > 0 && todas.every((p) => p.status === 'CONCLUIDA');
  await prisma.campeonato.update({
    where: { id: campeonatoId },
    data: { status: todasConcluidas ? 'ENCERRADO' : 'EM_ANDAMENTO' },
  });
}

export async function listarRodadas(campeonatoId) {
  const c = await prisma.campeonato.findUnique({ where: { id: campeonatoId } });
  if (!c) throw badRequest('Campeonato não encontrado');
  const partidas = await prisma.partida.findMany({
    where: { campeonatoId },
    orderBy: [
      { rodada: 'asc' },
      { dataPartida: { sort: 'asc', nulls: 'last' } },
      { ordemFase: 'asc' },
      { legOrdem: 'asc' },
      { id: 'asc' },
    ],
    include: {
      mandante: { select: { id: true, nome: true, escudoUrl: true, cor: true, abreviacao: true } },
      visitante: { select: { id: true, nome: true, escudoUrl: true, cor: true, abreviacao: true } },
      grupo: { select: { id: true, nome: true } },
    },
  });
  return agrupar(partidas, c.formato);
}

function agrupar(partidas, formato) {
  // grupos: Map<grupoNome, Map<rodada, Partida[]>>, mantendo ordem de inserção
  const grupos = new Map();
  const koPorRodada = new Map();
  for (const p of partidas) {
    if (p.grupo) {
      if (!grupos.has(p.grupo.nome)) grupos.set(p.grupo.nome, new Map());
      const r = grupos.get(p.grupo.nome);
      if (!r.has(p.rodada)) r.set(p.rodada, []);
      r.get(p.rodada).push(p);
    } else {
      if (!koPorRodada.has(p.rodada)) koPorRodada.set(p.rodada, []);
      koPorRodada.get(p.rodada).push(p);
    }
  }

  const out = [];
  // Fase de grupos primeiro, em ordem alfabética do grupo.
  for (const nome of [...grupos.keys()].sort()) {
    for (const [rodada, lista] of grupos.get(nome)) {
      out.push({ titulo: `Grupo ${nome} — Rodada ${rodada}`, partidas: lista.map(toPartidaDto) });
    }
  }
  // Depois KO (ou pontos corridos puro).
  for (const [rodada, lista] of koPorRodada) {
    const temKO = formato === 'MATA_MATA' || formato === 'GRUPOS_MATA_MATA';
    const titulo = temKO ? (lista[0]?.fase ?? `Fase ${rodada}`) : `Rodada ${rodada}`;
    out.push({ titulo, partidas: lista.map(toPartidaDto) });
  }
  return out;
}

export function toPartidaDto(p) {
  return {
    id: p.id,
    rodada: p.rodada,
    fase: p.fase,
    ordemFase: p.ordemFase,
    legOrdem: p.legOrdem,
    status: p.status,
    dataPartida: p.dataPartida,
    local: p.local,
    transmissao: p.transmissao ?? null,
    camposArbitragemOcultos: p.camposArbitragemOcultos ?? [],
    camposCustom: p.camposCustom ?? {},
    campeonatoId: p.campeonatoId,
    mandante: p.mandante,
    visitante: p.visitante,
    golsMandante: p.golsMandante,
    golsVisitante: p.golsVisitante,
    prorrogacao: p.prorrogacao,
    golsMandanteProrr: p.golsMandanteProrr,
    golsVisitanteProrr: p.golsVisitanteProrr,
    penaltisMandante: p.penaltisMandante,
    penaltisVisitante: p.penaltisVisitante,
  };
}

export async function detalhe(partidaId) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: {
      mandante: { select: { id: true, nome: true, escudoUrl: true, cor: true, abreviacao: true } },
      visitante: { select: { id: true, nome: true, escudoUrl: true, cor: true, abreviacao: true } },
      juiz: { select: { id: true, nome: true, email: true } },
      auxiliares: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
      gols: { include: { jogador: true }, orderBy: [{ tempoSegundos: 'asc' }, { minuto: 'asc' }, { id: 'asc' }] },
      cartoes: {
        include: { jogador: true },
        orderBy: [{ tempoSegundos: 'asc' }, { minuto: 'asc' }, { id: 'asc' }],
      },
      escalacoes: { include: { jogador: true } },
      substituicoes: {
        include: { entrouJogador: true, saiuJogador: true },
        orderBy: [{ periodo: 'asc' }, { tempoSegundos: 'asc' }, { id: 'asc' }],
      },
      stats: true,
      campeonato: { select: { id: true, sumulaConfig: true, duracaoPrimeiroTempo: true, duracaoSegundoTempo: true } },
    },
  });
  if (!p) throw badRequest('Partida não encontrada');

  const arbitrosExtras = await usuariosPorIds([
    p.assistente1Id,
    p.assistente2Id,
    p.quartoArbitroId,
    p.varId,
    p.avarId,
    p.avar2Id,
    p.observadorVarId,
  ]);

  return {
    partida: toPartidaDto(p),
    sumulaConfig: p.campeonato?.sumulaConfig ?? { secoes: {}, subsecoes: {}, camposCustom: [] },
    duracaoPrimeiroTempo: p.campeonato?.duracaoPrimeiroTempo ?? 45,
    duracaoSegundoTempo: p.campeonato?.duracaoSegundoTempo ?? 45,
    arbitragem: {
      juiz: p.juiz ?? null,
      assistente1: arbitrosExtras[p.assistente1Id] ?? null,
      assistente2: arbitrosExtras[p.assistente2Id] ?? null,
      quartoArbitro: arbitrosExtras[p.quartoArbitroId] ?? null,
      var: arbitrosExtras[p.varId] ?? null,
      avar: arbitrosExtras[p.avarId] ?? null,
      avar2: arbitrosExtras[p.avar2Id] ?? null,
      observadorVar: arbitrosExtras[p.observadorVarId] ?? null,
      auxiliares: p.auxiliares.map((a) => a.usuario),
    },
    cronologia: {
      entradaMandante: p.entradaMandante,
      entradaVisitante: p.entradaVisitante,
      inicio1T: p.inicio1T,
      termino1T: p.termino1T,
      acrescimo1T: p.acrescimo1T,
      inicio2T: p.inicio2T,
      termino2T: p.termino2T,
      acrescimo2T: p.acrescimo2T,
      placar1TMandante: p.placar1TMandante,
      placar1TVisitante: p.placar1TVisitante,
    },
    observacoes: {
      ocorrencias: p.ocorrencias,
      motivoAtraso: p.motivoAtraso,
      observacoesEventuais: p.observacoesEventuais,
      relatorioAssistente: p.relatorioAssistente,
    },
    gols: p.gols.map((g) => ({
      id: g.id,
      timeId: g.timeId,
      jogadorId: g.jogadorId,
      jogadorNome: g.jogador?.nome ?? null,
      jogadorApelido: g.jogador?.apelido ?? null,
      minuto: g.minuto,
      tempoSegundos: g.tempoSegundos,
      tipo: g.tipo,
    })),
    cartoes: p.cartoes.map((c) => ({
      id: c.id,
      timeId: c.timeId,
      jogadorId: c.jogadorId,
      jogadorNome: c.jogador?.nome ?? null,
      jogadorApelido: c.jogador?.apelido ?? null,
      tipo: c.tipo,
      minuto: c.minuto,
      tempoSegundos: c.tempoSegundos,
      motivoCodigo: c.motivoCodigo,
      motivoDescricao: c.motivoDescricao,
    })),
    escalacao: p.escalacoes.map((e) => ({
      jogadorId: e.jogadorId,
      tipo: e.tipo,
      timeId: e.jogador.timeId,
      jogador: {
        id: e.jogador.id,
        numero: e.jogador.numero,
        nome: e.jogador.nome,
        apelido: e.jogador.apelido,
        nomeCompleto: e.jogador.nomeCompleto,
        registro: e.jogador.registro,
        profissional: e.jogador.profissional,
        posicao: e.jogador.posicao,
      },
    })),
    substituicoes: p.substituicoes.map((s) => ({
      id: s.id,
      timeId: s.timeId,
      periodo: s.periodo,
      tempoSegundos: s.tempoSegundos,
      entrou: { id: s.entrouJogador.id, numero: s.entrouJogador.numero, nome: s.entrouJogador.nome },
      saiu: { id: s.saiuJogador.id, numero: s.saiuJogador.numero, nome: s.saiuJogador.nome },
    })),
    stats: p.stats.map((s) => ({ id: s.id, timeId: s.timeId, chave: s.chave, valor: s.valor })),
  };
}

async function usuariosPorIds(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const users = await prisma.usuario.findMany({
    where: { id: { in: uniq } },
    select: { id: true, nome: true, email: true },
  });
  return Object.fromEntries(users.map((u) => [u.id, u]));
}
