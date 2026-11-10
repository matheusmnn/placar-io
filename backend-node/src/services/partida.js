import { prisma } from '../lib/prisma.js';
import { badRequest } from '../lib/http.js';
import { pontosCorridos, mataMataPrimeiraFase, proximaPotenciaDeDois, faseLabel, BYE } from './chaveamento.js';
import { resolverConfronto } from './confronto.js';

export async function gerarRodadas(campeonatoId) {
  const camp = await prisma.campeonato.findUnique({ where: { id: campeonatoId } });
  if (!camp) throw badRequest('Campeonato não encontrado');
  const times = await prisma.time.findMany({
    where: { campeonatoId },
    orderBy: { nome: 'asc' },
  });
  if (times.length < 2) throw badRequest('Cadastre pelo menos 2 times antes de gerar as rodadas');

  await prisma.partida.deleteMany({ where: { campeonatoId } });

  if (camp.formato === 'PONTOS_CORRIDOS') {
    const confrontos = pontosCorridos(times.length, camp.idaVolta);
    await prisma.partida.createMany({
      data: confrontos.map((c) => ({
        campeonatoId,
        mandanteId: times[c.mandante].id,
        visitanteId: times[c.visitante].id,
        rodada: c.rodada,
      })),
    });
  } else {
    await criarFaseKO(camp, 1, faseLabel(proximaPotenciaDeDois(times.length)), mataMataPrimeiraFase(times.length).map((par) => ({
      mandanteId: times[par.mandante].id,
      visitanteId: par.visitante === BYE ? null : times[par.visitante].id,
      ordemFase: par.ordem,
    })));
  }

  await prisma.campeonato.update({ where: { id: campeonatoId }, data: { status: 'EM_ANDAMENTO' } });

  if (camp.formato === 'MATA_MATA') await verificarAvancoMataMata(camp, 1);

  return listarRodadas(campeonatoId);
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

  const mataMata = p.campeonato.formato === 'MATA_MATA';

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

  if (mataMata) await verificarAvancoMataMata(p.campeonato, p.rodada);
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
    where: { campeonatoId: camp.id, rodada },
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

  const proxima = await prisma.partida.count({ where: { campeonatoId: camp.id, rodada: rodada + 1 } });
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
    orderBy: [{ rodada: 'asc' }, { ordemFase: 'asc' }, { legOrdem: 'asc' }, { id: 'asc' }],
    include: {
      mandante: { select: { id: true, nome: true, escudoUrl: true } },
      visitante: { select: { id: true, nome: true, escudoUrl: true } },
    },
  });
  return agrupar(partidas, c.formato);
}

function agrupar(partidas, formato) {
  const porRodada = new Map();
  for (const p of partidas) {
    if (!porRodada.has(p.rodada)) porRodada.set(p.rodada, []);
    porRodada.get(p.rodada).push(p);
  }
  const out = [];
  for (const [rodada, lista] of porRodada) {
    const titulo = formato === 'MATA_MATA' ? (lista[0]?.fase ?? `Fase ${rodada}`) : `Rodada ${rodada}`;
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
      mandante: { select: { id: true, nome: true, escudoUrl: true } },
      visitante: { select: { id: true, nome: true, escudoUrl: true } },
      gols: { include: { jogador: true }, orderBy: [{ minuto: 'asc' }, { id: 'asc' }] },
      cartoes: { include: { jogador: true }, orderBy: [{ minuto: 'asc' }, { id: 'asc' }] },
    },
  });
  if (!p) throw badRequest('Partida não encontrada');
  return {
    partida: toPartidaDto(p),
    gols: p.gols.map((g) => ({
      id: g.id,
      timeId: g.timeId,
      jogadorId: g.jogadorId,
      jogadorNome: g.jogador?.nome ?? null,
      minuto: g.minuto,
    })),
    cartoes: p.cartoes.map((c) => ({
      id: c.id,
      timeId: c.timeId,
      jogadorId: c.jogadorId,
      jogadorNome: c.jogador?.nome ?? null,
      tipo: c.tipo,
      minuto: c.minuto,
    })),
  };
}
