import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { detalhe, registrarResultado } from '../services/partida.js';

export const partidasRouter = Router();
partidasRouter.use(authRequired);

async function assertOwnedPartida(usuarioId, partidaId) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: { campeonato: { select: { usuarioId: true } } },
  });
  if (!p || p.campeonato.usuarioId !== usuarioId) throw notFound('Partida não encontrada');
}

const resultadoSchema = z.object({
  golsMandante: z.number().int().min(0).max(99),
  golsVisitante: z.number().int().min(0).max(99),
  gols: z
    .array(
      z.object({
        timeId: z.number().int(),
        jogadorId: z.number().int().optional(),
        minuto: z.number().int().min(0).max(130).optional(),
      }),
    )
    .optional(),
  cartoes: z
    .array(
      z.object({
        timeId: z.number().int(),
        jogadorId: z.number().int().optional(),
        tipo: z.enum(['AMARELO', 'VERMELHO']),
        minuto: z.number().int().min(0).max(130).optional(),
      }),
    )
    .optional(),
});

partidasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await assertOwnedPartida(req.userId, id);
    res.json(await detalhe(id));
  }),
);

partidasRouter.put(
  '/:id/resultado',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await assertOwnedPartida(req.userId, id);
    const data = resultadoSchema.parse(req.body);
    res.json(await registrarResultado(id, data));
  }),
);
