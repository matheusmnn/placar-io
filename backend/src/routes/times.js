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
  grupoId: z.number().int().nullable().optional(),
});

timesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const t0 = await getOwnedTime(req.userId, id);
    const data = timeSchema.parse(req.body);
    if (data.grupoId != null) {
      const g = await prisma.grupo.findUnique({ where: { id: data.grupoId } });
      if (!g || g.campeonatoId !== t0.campeonatoId) throw notFound('Grupo não encontrado neste campeonato');
    }
    const t = await prisma.time.update({
      where: { id },
      data: {
        nome: data.nome.trim(),
        cidade: data.cidade ?? null,
        escudoUrl: data.escudoUrl ?? null,
        grupoId: data.grupoId === undefined ? undefined : data.grupoId,
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
  apelido: z.string().max(60).nullable().optional(),
  nomeCompleto: z.string().max(200).nullable().optional(),
  registro: z.string().max(60).nullable().optional(),
  profissional: z.boolean().optional(),
  posicao: z.enum(['GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE']).nullable().optional(),
});

// Comissão técnica do time (cadastro permanente).
const comissaoSchema = z.object({
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

timesRouter.get(
  '/:id/comissao',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedTime(req.userId, id);
    const lista = await prisma.comissaoTecnica.findMany({
      where: { timeId: id },
      orderBy: [{ funcao: 'asc' }, { nome: 'asc' }],
    });
    res.json(lista);
  }),
);

timesRouter.post(
  '/:id/comissao',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwnedTime(req.userId, id);
    const data = comissaoSchema.parse(req.body);
    const c = await prisma.comissaoTecnica.create({
      data: { timeId: id, nome: data.nome.trim(), funcao: data.funcao },
    });
    res.status(201).json(c);
  }),
);

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
        apelido: data.apelido ?? null,
        nomeCompleto: data.nomeCompleto ?? null,
        registro: data.registro ?? null,
        profissional: data.profissional ?? true,
        posicao: data.posicao ?? null,
      },
    });
    res.status(201).json(j);
  }),
);
