import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { listarRodadas } from '../services/partida.js';
import { calcular } from '../services/classificacao.js';

export const publicoRouter = Router();

async function getCamp(id) {
  const c = await prisma.campeonato.findUnique({ where: { id } });
  if (!c) throw notFound('Campeonato não encontrado');
  return c;
}

publicoRouter.get(
  '/campeonatos',
  asyncHandler(async (_req, res) => {
    const lista = await prisma.campeonato.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { inscricoes: true } } },
    });
    res.json(
      lista.map((c) => ({
        id: c.id,
        nome: c.nome,
        formato: c.formato,
        status: c.status,
        dataInicio: c.dataInicio,
        dataFim: c.dataFim,
        qtdTimes: c._count.inscricoes,
      })),
    );
  }),
);

publicoRouter.get(
  '/campeonatos/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await prisma.campeonato.findUnique({
      where: { id },
      include: {
        campeonatoVinculado: { select: { id: true, nome: true } },
        vinculados: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
      },
    });
    if (!c) throw notFound('Campeonato não encontrado');
    const partidas = await prisma.partida.findMany({ where: { campeonatoId: id } });
    const total = partidas.length;
    const jogadas = partidas.filter((p) => p.status === 'CONCLUIDA').length;
    const rodadasTotais = partidas.reduce((max, p) => Math.max(max, p.rodada), 0);
    const rodadasJogadas = partidas
      .filter((p) => p.status === 'CONCLUIDA')
      .reduce((max, p) => Math.max(max, p.rodada), 0);
    const qtdTimes = await prisma.inscricaoCampeonato.count({ where: { campeonatoId: id } });
    const totalGols = await prisma.gol.count({ where: { partida: { campeonatoId: id } } });
    res.json({
      id: c.id,
      nome: c.nome,
      formato: c.formato,
      status: c.status,
      logoUrl: c.logoUrl,
      descricao: c.descricao,
      faixasTabela: c.faixasTabela,
      campeonatoVinculado: c.campeonatoVinculado,
      vinculados: c.vinculados,
      qtdTimes,
      totalPartidas: total,
      partidasJogadas: jogadas,
      rodadasTotais,
      rodadasJogadas,
      totalGols,
    });
  }),
);

publicoRouter.get(
  '/campeonatos/:id/classificacao',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await getCamp(id);
    const inscr = await prisma.inscricaoCampeonato.findMany({
      where: { campeonatoId: id }, include: { time: true },
      orderBy: { time: { nome: 'asc' } },
    });
    const times = inscr.map((i) => i.time);
    const partidas = await prisma.partida.findMany({ where: { campeonatoId: id } });
    res.json(calcular(times, partidas, c.pontosVitoria, c.pontosEmpate, c.criteriosDesempate));
  }),
);

publicoRouter.get(
  '/campeonatos/:id/classificacao-grupos',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await getCamp(id);
    const grupos = await prisma.grupo.findMany({
      where: { campeonatoId: id },
      orderBy: { nome: 'asc' },
      include: { inscricoes: { include: { time: true } } },
    });
    const partidasGrupo = await prisma.partida.findMany({
      where: { campeonatoId: id, NOT: { grupoId: null } },
    });
    res.json(
      grupos.map((g) => ({
        grupoId: g.id,
        nome: g.nome,
        linhas: calcular(
          g.inscricoes.map((i) => i.time),
          partidasGrupo.filter((p) => p.grupoId === g.id),
          c.pontosVitoria,
          c.pontosEmpate,
          c.criteriosDesempate,
        ),
      })),
    );
  }),
);

publicoRouter.get(
  '/campeonatos/:id/artilharia',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getCamp(id);
    const rows = await prisma.$queryRaw`
      SELECT g."jogadorId"          AS "jogadorId",
             j."nome"                AS "jogadorNome",
             j."timeId"              AS "timeId",
             t."nome"                AS "timeNome",
             t."escudoUrl"           AS "escudoUrl",
             t."cor"                 AS "cor",
             t."abreviacao"          AS "abreviacao",
             COUNT(*)::int           AS gols
      FROM "Gol" g
      JOIN "Partida" p ON p."id" = g."partidaId"
      JOIN "Jogador" j ON j."id" = g."jogadorId"
      JOIN "Time"    t ON t."id" = j."timeId"
      WHERE p."campeonatoId" = ${id}
        AND g."jogadorId" IS NOT NULL
      GROUP BY g."jogadorId", j."nome", j."timeId", t."nome", t."escudoUrl", t."cor", t."abreviacao"
      ORDER BY gols DESC, j."nome" ASC
    `;
    res.json(rows);
  }),
);

publicoRouter.get(
  '/campeonatos/:id/rodadas',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getCamp(id);
    res.json(await listarRodadas(id));
  }),
);
