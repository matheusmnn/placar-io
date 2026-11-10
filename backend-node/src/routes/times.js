import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/http.js';

export const timesRouter = Router();
timesRouter.use(authRequired);

async function getOwnedTime(usuarioId, timeId) {
  const t = await prisma.time.findUnique({
    where: { id: timeId },
    include: { campeonato: { select: { usuarioId: true } } },
  });
  if (!t || t.campeonato.usuarioId !== usuarioId) throw notFound('Time não encontrado');
  return t;
}

const timeSchema = z.object({
  nome: z.string().min(1).max(120),
  cidade: z.string().max(120).nullable().optional(),
  escudoUrl: z.string().url().nullable().optional(),
});

timesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedTime(req.userId, id);
    const data = timeSchema.parse(req.body);
    const t = await prisma.time.update({
      where: { id },
      data: {
        nome: data.nome.trim(),
        cidade: data.cidade ?? null,
        escudoUrl: data.escudoUrl ?? null,
      },
    });
    res.json(t);
  }),
);

timesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedTime(req.userId, id);
    await prisma.time.delete({ where: { id } });
    res.status(204).end();
  }),
);

// jogadores do time
timesRouter.get(
  '/:id/jogadores',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedTime(req.userId, id);
    const jogadores = await prisma.jogador.findMany({
      where: { timeId: id },
      orderBy: [{ numero: 'asc' }, { nome: 'asc' }],
    });
    res.json(jogadores);
  }),
);

const jogadorSchema = z.object({
  numero: z.number().int().min(0).max(999).nullable().optional(),
  nome: z.string().min(1).max(120),
  posicao: z.enum(['GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE']).nullable().optional(),
});

timesRouter.post(
  '/:id/jogadores',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedTime(req.userId, id);
    const data = jogadorSchema.parse(req.body);
    const j = await prisma.jogador.create({
      data: {
        timeId: id,
        numero: data.numero ?? null,
        nome: data.nome.trim(),
        posicao: data.posicao ?? null,
      },
    });
    res.status(201).json(j);
  }),
);
