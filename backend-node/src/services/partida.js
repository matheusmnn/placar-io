import { prisma } from '../lib/prisma.js';
import { badRequest } from '../lib/http.js';
import { pontosCorridos, mataMataPrimeiraFase, proximaPotenciaDeDois, faseLabel, BYE } from './chaveamento.js';

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
    const label = faseLabel(proximaPotenciaDeDois(times.length));
    const pares = mataMataPrimeiraFase(times.length);
    for (const par of pares) {
      const mandanteId = times[par.mandante].id;
      const visitanteId = par.visitante === BYE ? null : times[par.visitante].id;
      await prisma.partida.create({
        data: {
          campeonatoId,
          mandanteId,
          visitanteId,
          rodada: 1,
          ordemFase: par.ordem,
          fase: label,
          status: visitanteId == null ? 'CONCLUIDA' : 'AGENDADA',
        },
      });
    }
  }

  await prisma.campeonato.update({ where: { id: campeonatoId }, data: { status: 'EM_ANDAMENTO' } });

  if (camp.formato === 'MATA_MATA') await verificarAvancoMataMata(campeonatoId, 1);

  return listarRodadas(campeonatoId);
}

export async function registrarResultado(partidaId, req) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: { campeonato: true },
  });
  if (!p) throw badRequest('Partida não encontrada');
  if (p.mandanteId == null || p.visitanteId == null) throw badRequest('Essa partida não pode receber resultado');

  const mataMata = p.campeonato.formato === 'MATA_MATA';
  if (mataMata && req.golsMandante === req.golsVisitante) {
    throw badRequest('No mata-mata a partida precisa ter um vencedor');
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
        status: 'CONCLUIDA',
      },
    }),
    prisma.gol.createMany({ data: golsNovos }),
    prisma.cartao.createMany({ data: cartoesNovos }),
  ]);

  if (mataMata) await verificarAvancoMataMata(p.campeonatoId, p.rodada);
  else await verificarEncerramento(p.campeonatoId);

  return detalhe(partidaId);
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

async function verificarAvancoMataMata(campeonatoId, rodada) {
  const faseAtual = await prisma.partida.findMany({
    where: { campeonatoId, rodada },
    orderBy: [{ ordemFase: 'asc' }, { id: 'asc' }],
    include: { mandante: true, visitante: true },
  });
  if (faseAtual.length === 0) return;
  if (!faseAtual.every((p) => p.status === 'CONCLUIDA')) return;

  const vencedores = faseAtual.map(vencedor).filter(Boolean);
  if (vencedores.length === 1) {
    await prisma.campeonato.update({ where: { id: campeonatoId }, data: { status: 'ENCERRADO' } });
    return;
  }
  const proxima = await prisma.partida.count({ where: { campeonatoId, rodada: rodada + 1 } });
  if (proxima > 0) return;

  const label = faseLabel(vencedores.length);
  const novas = [];
  for (let i = 0; i < vencedores.length / 2; i++) {
    novas.push({
      campeonatoId,
      mandanteId: vencedores[2 * i],
      visitanteId: vencedores[2 * i + 1],
      rodada: rodada + 1,
      ordemFase: i,
      fase: label,
    });
  }
  await prisma.partida.createMany({ data: novas });
}

function vencedor(p) {
  if (p.visitanteId == null) return p.mandanteId;
  if (p.mandanteId == null) return p.visitanteId;
  const gm = p.golsMandante ?? 0;
  const gv = p.golsVisitante ?? 0;
  return gm >= gv ? p.mandanteId : p.visitanteId;
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
    orderBy: [{ rodada: 'asc' }, { ordemFase: 'asc' }, { id: 'asc' }],
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
    status: p.status,
    dataPartida: p.dataPartida,
    local: p.local,
    mandante: p.mandante,
    visitante: p.visitante,
    golsMandante: p.golsMandante,
    golsVisitante: p.golsVisitante,
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
