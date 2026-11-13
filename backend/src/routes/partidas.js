import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { detalhe, registrarResultado } from '../services/partida.js';

export const partidasRouter = Router();
partidasRouter.use(authRequired);

async function assertOwnedPartida(usuarioId, partidaId) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: { campeonato: { select: { usuarioId: true } } },
  });
  if (!p || p.campeonato.usuarioId !== usuarioId) throw notFound('Partida não encontrada');
  return p;
}

async function assertTimesInscritos(campeonatoId, ...timeIds) {
  const ids = timeIds.filter((id) => id != null);
  if (new Set(ids).size !== ids.length) throw badRequest('Mandante e visitante devem ser times diferentes');
  const inscritas = await prisma.inscricaoCampeonato.count({
    where: { campeonatoId, timeId: { in: ids } },
  });
  if (inscritas !== ids.length) throw badRequest('Time não inscrito neste campeonato');
}

const resultadoSchema = z.object({
  golsMandante: z.number().int().min(0).max(99),
  golsVisitante: z.number().int().min(0).max(99),
  prorrogacao: z.boolean().optional(),
  golsMandanteProrr: z.number().int().min(0).max(99).nullable().optional(),
  golsVisitanteProrr: z.number().int().min(0).max(99).nullable().optional(),
  penaltisMandante: z.number().int().min(0).max(99).nullable().optional(),
  penaltisVisitante: z.number().int().min(0).max(99).nullable().optional(),
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

const dadosSchema = z.object({
  dataPartida: z.string().datetime().nullable().optional(),
  local: z.string().max(200).nullable().optional(),
  transmissao: z.string().max(500).nullable().optional(),
  camposArbitragemOcultos: z.array(z.string()).max(20).optional(),
  camposCustom: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const patchSchema = z.object({
  mandanteId: z.number().int().positive().optional(),
  visitanteId: z.number().int().positive().optional(),
  rodada: z.number().int().min(1).max(500).optional(),
});

partidasRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const atual = await assertOwnedPartida(req.userId, id);
    if (atual.status !== 'AGENDADA') throw badRequest('Só partidas agendadas podem ser editadas');
    const data = patchSchema.parse(req.body);
    const mudaRodada = data.rodada != null;
    const mudaTime = data.mandanteId != null || data.visitanteId != null;
    const ehFaseOuGrupo = atual.grupoId != null || atual.fase != null;
    if (mudaRodada && ehFaseOuGrupo) {
      throw badRequest('Rodada só pode ser mudada em partidas de pontos corridos');
    }
    if (mudaTime) {
      const mandanteId = data.mandanteId ?? atual.mandanteId;
      const visitanteId = data.visitanteId ?? atual.visitanteId;
      await assertTimesInscritos(atual.campeonatoId, mandanteId, visitanteId);
    }
    const atualizada = await prisma.partida.update({
      where: { id },
      data: {
        mandanteId: data.mandanteId ?? undefined,
        visitanteId: data.visitanteId ?? undefined,
        rodada: data.rodada ?? undefined,
      },
    });
    res.json(atualizada);
  }),
);

partidasRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const atual = await assertOwnedPartida(req.userId, id);
    if (atual.status !== 'AGENDADA') throw badRequest('Só partidas agendadas podem ser removidas');
    if (atual.grupoId != null || atual.fase != null) throw badRequest('Partida de grupo/fase não pode ser removida manualmente');
    await prisma.partida.delete({ where: { id } });
    res.status(204).end();
  }),
);

partidasRouter.put(
  '/:id/dados',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await assertOwnedPartida(req.userId, id);
    const data = dadosSchema.parse(req.body);
    const atualizada = await prisma.partida.update({
      where: { id },
      data: {
        dataPartida: data.dataPartida === undefined ? undefined : (data.dataPartida ? new Date(data.dataPartida) : null),
        local: data.local === undefined ? undefined : data.local,
        transmissao: data.transmissao === undefined ? undefined : data.transmissao,
        camposArbitragemOcultos: data.camposArbitragemOcultos === undefined ? undefined : data.camposArbitragemOcultos,
        camposCustom: data.camposCustom === undefined ? undefined : data.camposCustom,
      },
    });
    res.json(atualizada);
  }),
);
