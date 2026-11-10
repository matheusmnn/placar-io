import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/http.js';

export const comissaoRouter = Router();
comissaoRouter.use(authRequired);

async function assertOwned(usuarioId, id) {
  const c = await prisma.comissaoTecnica.findUnique({
    where: { id },
    include: { time: { include: { campeonato: { select: { usuarioId: true } } } } },
  });
  if (!c || c.time.campeonato.usuarioId !== usuarioId) throw notFound('Membro da comissão não encontrado');
  return c;
}

const schema = z.object({
  nome: z.string().min(1).max(120),
  funcao: z.enum([
    'TECNICO',
    'ASSISTENTE_TECNICO',
    'MEDICO',
    'TREINADOR_GOLEIROS',
    'PREPARADOR_FISICO',
    'FISIOTERAPEUTA',
    'MASSAGISTA',
  ]),
});

comissaoRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await assertOwned(req.userId, id);
    const data = schema.parse(req.body);
    const c = await prisma.comissaoTecnica.update({
      where: { id },
      data: { nome: data.nome.trim(), funcao: data.funcao },
    });
    res.json(c);
  }),
);

comissaoRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await assertOwned(req.userId, id);
    await prisma.comissaoTecnica.delete({ where: { id } });
    res.status(204).end();
  }),
);
