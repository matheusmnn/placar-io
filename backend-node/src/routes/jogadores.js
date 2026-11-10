import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/http.js';

export const jogadoresRouter = Router();
jogadoresRouter.use(authRequired);

async function getOwnedJogador(usuarioId, jogadorId) {
  const j = await prisma.jogador.findUnique({
    where: { id: jogadorId },
    include: { time: { include: { campeonato: { select: { usuarioId: true } } } } },
  });
  if (!j || j.time.campeonato.usuarioId !== usuarioId) throw notFound('Jogador não encontrado');
  return j;
}

const jogadorSchema = z.object({
  numero: z.number().int().min(0).max(999).nullable().optional(),
  nome: z.string().min(1).max(120),
  posicao: z.enum(['GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE']).nullable().optional(),
});

jogadoresRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedJogador(req.userId, id);
    const data = jogadorSchema.parse(req.body);
    const j = await prisma.jogador.update({
      where: { id },
      data: {
        numero: data.numero ?? null,
        nome: data.nome.trim(),
        posicao: data.posicao ?? null,
      },
    });
    res.json(j);
  }),
);

jogadoresRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedJogador(req.userId, id);
    await prisma.jogador.delete({ where: { id } });
    res.status(204).end();
  }),
);
