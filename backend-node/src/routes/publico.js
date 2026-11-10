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
      include: { _count: { select: { times: true } } },
    });
    res.json(
      lista.map((c) => ({
        id: c.id,
        nome: c.nome,
        formato: c.formato,
        status: c.status,
        dataInicio: c.dataInicio,
        dataFim: c.dataFim,
        qtdTimes: c._count.times,
      })),
    );
  }),
);

publicoRouter.get(
  '/campeonatos/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await getCamp(id);
    const partidas = await prisma.partida.findMany({ where: { campeonatoId: id } });
    const total = partidas.length;
    const jogadas = partidas.filter((p) => p.status === 'CONCLUIDA').length;
    const rodadasTotais = partidas.reduce((max, p) => Math.max(max, p.rodada), 0);
    const rodadasJogadas = partidas
      .filter((p) => p.status === 'CONCLUIDA')
      .reduce((max, p) => Math.max(max, p.rodada), 0);
    const qtdTimes = await prisma.time.count({ where: { campeonatoId: id } });
    const totalGols = await prisma.gol.count({ where: { partida: { campeonatoId: id } } });
    res.json({
      id: c.id,
      nome: c.nome,
      formato: c.formato,
      status: c.status,
      logoUrl: c.logoUrl,
      descricao: c.descricao,
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
    const times = await prisma.time.findMany({ where: { campeonatoId: id }, orderBy: { nome: 'asc' } });
    const partidas = await prisma.partida.findMany({ where: { campeonatoId: id } });
    res.json(calcular(times, partidas, c.pontosVitoria, c.pontosEmpate));
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
             COUNT(*)::int           AS gols
      FROM "Gol" g
      JOIN "Partida" p ON p."id" = g."partidaId"
      JOIN "Jogador" j ON j."id" = g."jogadorId"
      JOIN "Time"    t ON t."id" = j."timeId"
      WHERE p."campeonatoId" = ${id}
        AND g."jogadorId" IS NOT NULL
      GROUP BY g."jogadorId", j."nome", j."timeId", t."nome", t."escudoUrl"
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
