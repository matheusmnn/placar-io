import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { gerarRodadas, listarRodadas } from '../services/partida.js';

export const campeonatosRouter = Router();

const campeonatoSchema = z.object({
  nome: z.string().min(1).max(200),
  formato: z.enum(['PONTOS_CORRIDOS', 'MATA_MATA']).optional(),
  pontosVitoria: z.number().int().min(0).max(10).optional(),
  pontosEmpate: z.number().int().min(0).max(10).optional(),
  idaVolta: z.boolean().optional(),
  koDesempate: z.enum(['PENALTIS', 'PRORROGACAO_PENALTIS']).optional(),
  dataInicio: z.string().datetime().nullable().optional(),
  dataFim: z.string().datetime().nullable().optional(),
  descricao: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

function toCampDto(c, qtdTimes) {
  return {
    id: c.id,
    nome: c.nome,
    formato: c.formato,
    status: c.status,
    pontosVitoria: c.pontosVitoria,
    pontosEmpate: c.pontosEmpate,
    idaVolta: c.idaVolta,
    koDesempate: c.koDesempate,
    dataInicio: c.dataInicio,
    dataFim: c.dataFim,
    descricao: c.descricao,
    logoUrl: c.logoUrl,
    qtdTimes,
  };
}

async function getOwned(usuarioId, id) {
  const c = await prisma.campeonato.findFirst({ where: { id, usuarioId } });
  if (!c) throw notFound('Campeonato não encontrado');
  return c;
}

campeonatosRouter.use(authRequired);

campeonatosRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lista = await prisma.campeonato.findMany({
      where: { usuarioId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { times: true } } },
    });
    const campeonatos = lista.map((c) => toCampDto(c, c._count.times));
    const stats = {
      total: lista.length,
      emAndamento: lista.filter((c) => c.status === 'EM_ANDAMENTO').length,
      naoIniciados: lista.filter((c) => c.status === 'NAO_INICIADO').length,
      encerrados: lista.filter((c) => c.status === 'ENCERRADO').length,
    };
    res.json({ stats, campeonatos });
  }),
);

campeonatosRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await getOwned(req.userId, id);
    const qtdTimes = await prisma.time.count({ where: { campeonatoId: id } });
    res.json(toCampDto(c, qtdTimes));
  }),
);

campeonatosRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = campeonatoSchema.parse(req.body);
    const c = await prisma.campeonato.create({
      data: {
        usuarioId: req.userId,
        nome: data.nome.trim(),
        formato: data.formato ?? 'PONTOS_CORRIDOS',
        pontosVitoria: data.pontosVitoria ?? 3,
        pontosEmpate: data.pontosEmpate ?? 1,
        idaVolta: data.idaVolta ?? false,
        koDesempate: data.koDesempate ?? 'PENALTIS',
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        descricao: data.descricao ?? null,
        logoUrl: data.logoUrl ?? null,
      },
    });
    res.status(201).json(toCampDto(c, 0));
  }),
);

campeonatosRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const data = campeonatoSchema.parse(req.body);
    const c = await prisma.campeonato.update({
      where: { id },
      data: {
        nome: data.nome.trim(),
        formato: data.formato ?? undefined,
        pontosVitoria: data.pontosVitoria ?? undefined,
        pontosEmpate: data.pontosEmpate ?? undefined,
        idaVolta: data.idaVolta ?? undefined,
        koDesempate: data.koDesempate ?? undefined,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        descricao: data.descricao ?? null,
        logoUrl: data.logoUrl ?? null,
      },
    });
    const qtdTimes = await prisma.time.count({ where: { campeonatoId: id } });
    res.json(toCampDto(c, qtdTimes));
  }),
);

campeonatosRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    await prisma.campeonato.delete({ where: { id } });
    res.status(204).end();
  }),
);

// times do campeonato
campeonatosRouter.get(
  '/:id/times',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const times = await prisma.time.findMany({ where: { campeonatoId: id }, orderBy: { nome: 'asc' } });
    res.json(times);
  }),
);

const timeSchema = z.object({
  nome: z.string().min(1).max(120),
  cidade: z.string().max(120).nullable().optional(),
  escudoUrl: z.string().url().nullable().optional(),
});

campeonatosRouter.post(
  '/:id/times',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const data = timeSchema.parse(req.body);
    const t = await prisma.time.create({
      data: {
        campeonatoId: id,
        nome: data.nome.trim(),
        cidade: data.cidade ?? null,
        escudoUrl: data.escudoUrl ?? null,
      },
    });
    res.status(201).json(t);
  }),
);

// rodadas
campeonatosRouter.post(
  '/:id/gerar-rodadas',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    res.json(await gerarRodadas(id));
  }),
);

campeonatosRouter.get(
  '/:id/partidas',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    res.json(await listarRodadas(id));
  }),
);
