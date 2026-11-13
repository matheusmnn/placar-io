import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { assertDonoDoCampeonato, assertPermissaoCampeonato, assertPodeEditarSumula, carregarPartidaComAuth } from '../services/permissoes.js';
import { fecharPlacar } from '../services/partida.js';

export const sumulaRouter = Router();
sumulaRouter.use(authRequired);

// -------- helpers ---------------------------------------------------------

async function carregarPartidaEditavel(req) {
  const partidaId = Number(req.params.id);
  const p = await carregarPartidaComAuth(partidaId);
  assertPodeEditarSumula(req.userId, p);
  return p;
}

async function validarJogadorDoTime(jogadorId, timeId) {
  if (jogadorId == null) return;
  const j = await prisma.jogador.findUnique({ where: { id: jogadorId } });
  if (!j) throw badRequest('Jogador não encontrado');
  if (j.timeId !== timeId) throw badRequest('O jogador não pertence ao time informado');
}

function validarTimeDaPartida(partida, timeId) {
  if (partida.mandanteId !== timeId && partida.visitanteId !== timeId) {
    throw badRequest('O time informado não participa dessa partida');
  }
}

async function usuarioPorEmail(email) {
  if (email == null) return null;
  const u = await prisma.usuario.findUnique({ where: { email } });
  if (!u) throw badRequest(`Usuário não encontrado: ${email}`);
  return u;
}

// -------- Gols ------------------------------------------------------------

const golSchema = z.object({
  timeId: z.number().int(),
  jogadorId: z.number().int().nullable().optional(),
  minuto: z.number().int().min(0).max(130).nullable().optional(),
  tempoSegundos: z.number().int().min(0).max(130 * 60).nullable().optional(),
  tipo: z.enum(['NORMAL', 'PENALTI', 'CONTRA', 'FALTA']).optional(),
});

sumulaRouter.post(
  '/partidas/:id/gols',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = golSchema.parse(req.body);
    validarTimeDaPartida(p, data.timeId);
    await validarJogadorDoTime(data.jogadorId ?? null, data.timeId);
    const g = await prisma.gol.create({
      data: {
        partidaId: p.id,
        timeId: data.timeId,
        jogadorId: data.jogadorId ?? null,
        minuto: data.minuto ?? null,
        tempoSegundos: data.tempoSegundos ?? null,
        tipo: data.tipo ?? 'NORMAL',
      },
    });
    res.status(201).json(g);
  }),
);

sumulaRouter.put(
  '/gols/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const g = await prisma.gol.findUnique({ where: { id } });
    if (!g) throw notFound('Gol não encontrado');
    const p = await carregarPartidaComAuth(g.partidaId);
    assertPodeEditarSumula(req.userId, p);
    const data = golSchema.parse(req.body);
    validarTimeDaPartida(p, data.timeId);
    await validarJogadorDoTime(data.jogadorId ?? null, data.timeId);
    const atualizado = await prisma.gol.update({
      where: { id },
      data: {
        timeId: data.timeId,
        jogadorId: data.jogadorId ?? null,
        minuto: data.minuto ?? null,
        tempoSegundos: data.tempoSegundos ?? null,
        tipo: data.tipo ?? 'NORMAL',
      },
    });
    res.json(atualizado);
  }),
);

sumulaRouter.delete(
  '/gols/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const g = await prisma.gol.findUnique({ where: { id } });
    if (!g) throw notFound('Gol não encontrado');
    const p = await carregarPartidaComAuth(g.partidaId);
    assertPodeEditarSumula(req.userId, p);
    await prisma.gol.delete({ where: { id } });
    res.status(204).end();
  }),
);

// -------- Cartões ---------------------------------------------------------

const cartaoSchema = z.object({
  timeId: z.number().int(),
  jogadorId: z.number().int().nullable().optional(),
  tipo: z.enum(['AMARELO', 'VERMELHO']),
  minuto: z.number().int().min(0).max(130).nullable().optional(),
  tempoSegundos: z.number().int().min(0).max(130 * 60).nullable().optional(),
  motivoCodigo: z.string().max(20).nullable().optional(),
  motivoDescricao: z.string().max(500).nullable().optional(),
});

sumulaRouter.post(
  '/partidas/:id/cartoes',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = cartaoSchema.parse(req.body);
    validarTimeDaPartida(p, data.timeId);
    await validarJogadorDoTime(data.jogadorId ?? null, data.timeId);
    const c = await prisma.cartao.create({
      data: {
        partidaId: p.id,
        timeId: data.timeId,
        jogadorId: data.jogadorId ?? null,
        tipo: data.tipo,
        minuto: data.minuto ?? null,
        tempoSegundos: data.tempoSegundos ?? null,
        motivoCodigo: data.motivoCodigo ?? null,
        motivoDescricao: data.motivoDescricao ?? null,
      },
    });
    res.status(201).json(c);
  }),
);

sumulaRouter.put(
  '/cartoes/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await prisma.cartao.findUnique({ where: { id } });
    if (!c) throw notFound('Cartão não encontrado');
    const p = await carregarPartidaComAuth(c.partidaId);
    assertPodeEditarSumula(req.userId, p);
    const data = cartaoSchema.parse(req.body);
    validarTimeDaPartida(p, data.timeId);
    await validarJogadorDoTime(data.jogadorId ?? null, data.timeId);
    const atualizado = await prisma.cartao.update({
      where: { id },
      data: {
        timeId: data.timeId,
        jogadorId: data.jogadorId ?? null,
        tipo: data.tipo,
        minuto: data.minuto ?? null,
        tempoSegundos: data.tempoSegundos ?? null,
        motivoCodigo: data.motivoCodigo ?? null,
        motivoDescricao: data.motivoDescricao ?? null,
      },
    });
    res.json(atualizado);
  }),
);

sumulaRouter.delete(
  '/cartoes/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await prisma.cartao.findUnique({ where: { id } });
    if (!c) throw notFound('Cartão não encontrado');
    const p = await carregarPartidaComAuth(c.partidaId);
    assertPodeEditarSumula(req.userId, p);
    await prisma.cartao.delete({ where: { id } });
    res.status(204).end();
  }),
);

// -------- Substituições ---------------------------------------------------

const substSchema = z.object({
  timeId: z.number().int(),
  periodo: z.enum(['PRIMEIRO_TEMPO', 'SEGUNDO_TEMPO']),
  entrouJogadorId: z.number().int(),
  saiuJogadorId: z.number().int(),
  tempoSegundos: z.number().int().min(0).max(130 * 60).nullable().optional(),
});

sumulaRouter.post(
  '/partidas/:id/substituicoes',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = substSchema.parse(req.body);
    validarTimeDaPartida(p, data.timeId);
    await validarJogadorDoTime(data.entrouJogadorId, data.timeId);
    await validarJogadorDoTime(data.saiuJogadorId, data.timeId);
    if (data.entrouJogadorId === data.saiuJogadorId) {
      throw badRequest('O jogador que entrou e o que saiu não podem ser o mesmo');
    }
    const s = await prisma.substituicao.create({
      data: {
        partidaId: p.id,
        timeId: data.timeId,
        periodo: data.periodo,
        entrouJogadorId: data.entrouJogadorId,
        saiuJogadorId: data.saiuJogadorId,
        tempoSegundos: data.tempoSegundos ?? null,
      },
    });
    res.status(201).json(s);
  }),
);

sumulaRouter.delete(
  '/substituicoes/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const s = await prisma.substituicao.findUnique({ where: { id } });
    if (!s) throw notFound('Substituição não encontrada');
    const p = await carregarPartidaComAuth(s.partidaId);
    assertPodeEditarSumula(req.userId, p);
    await prisma.substituicao.delete({ where: { id } });
    res.status(204).end();
  }),
);

// -------- Escalação (bulk set) --------------------------------------------

const escalacaoSchema = z.object({
  titulares: z.array(z.number().int()).max(50),
  reservas: z.array(z.number().int()).max(50),
});

sumulaRouter.put(
  '/partidas/:id/escalacao',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = escalacaoSchema.parse(req.body);

    const todosIds = [...data.titulares, ...data.reservas];
    if (new Set(todosIds).size !== todosIds.length) {
      throw badRequest('Jogador duplicado entre titulares e reservas');
    }
    if (todosIds.length > 0) {
      const timesValidos = [p.mandanteId, p.visitanteId].filter(Boolean);
      const jogadores = await prisma.jogador.findMany({ where: { id: { in: todosIds } } });
      if (jogadores.length !== todosIds.length) throw badRequest('Algum jogador não existe');
      for (const j of jogadores) {
        if (!timesValidos.includes(j.timeId)) {
          throw badRequest(`Jogador ${j.id} não pertence a nenhum dos times da partida`);
        }
      }
    }

    await prisma.$transaction([
      prisma.partidaEscalacao.deleteMany({ where: { partidaId: p.id } }),
      prisma.partidaEscalacao.createMany({
        data: [
          ...data.titulares.map((jogadorId) => ({ partidaId: p.id, jogadorId, tipo: 'TITULAR' })),
          ...data.reservas.map((jogadorId) => ({ partidaId: p.id, jogadorId, tipo: 'RESERVA' })),
        ],
      }),
    ]);

    const escalacoes = await prisma.partidaEscalacao.findMany({
      where: { partidaId: p.id },
      include: { jogador: true },
    });
    res.json(escalacoes);
  }),
);

// -------- Cronologia ------------------------------------------------------

const cronologiaSchema = z.object({
  entradaMandante: z.string().datetime().nullable().optional(),
  entradaVisitante: z.string().datetime().nullable().optional(),
  inicio1T: z.string().datetime().nullable().optional(),
  termino1T: z.string().datetime().nullable().optional(),
  acrescimo1T: z.number().int().min(0).max(30).nullable().optional(),
  inicio2T: z.string().datetime().nullable().optional(),
  termino2T: z.string().datetime().nullable().optional(),
  acrescimo2T: z.number().int().min(0).max(30).nullable().optional(),
  placar1TMandante: z.number().int().min(0).max(99).nullable().optional(),
  placar1TVisitante: z.number().int().min(0).max(99).nullable().optional(),
});

const toDateOrNull = (v) => (v == null ? null : new Date(v));

sumulaRouter.put(
  '/partidas/:id/cronologia',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = cronologiaSchema.parse(req.body);
    const promoveEmAndamento = p.status === 'AGENDADA' && data.inicio1T != null;
    const patch = {};
    const dataKeys = ['entradaMandante', 'entradaVisitante', 'inicio1T', 'termino1T', 'inicio2T', 'termino2T'];
    const intKeys = ['acrescimo1T', 'acrescimo2T', 'placar1TMandante', 'placar1TVisitante'];
    for (const k of dataKeys) if (k in data) patch[k] = toDateOrNull(data[k]);
    for (const k of intKeys) if (k in data) patch[k] = data[k] ?? null;
    if (promoveEmAndamento) patch.status = 'EM_ANDAMENTO';
    const atualizada = await prisma.partida.update({ where: { id: p.id }, data: patch });
    res.json(atualizada);
  }),
);

// -------- Observações ----------------------------------------------------

const obsSchema = z.object({
  ocorrencias: z.string().max(5000).nullable().optional(),
  motivoAtraso: z.string().max(2000).nullable().optional(),
  observacoesEventuais: z.string().max(5000).nullable().optional(),
  relatorioAssistente: z.string().max(5000).nullable().optional(),
});

sumulaRouter.put(
  '/partidas/:id/observacoes',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = obsSchema.parse(req.body);
    const atualizada = await prisma.partida.update({
      where: { id: p.id },
      data: {
        ocorrencias: data.ocorrencias ?? null,
        motivoAtraso: data.motivoAtraso ?? null,
        observacoesEventuais: data.observacoesEventuais ?? null,
        relatorioAssistente: data.relatorioAssistente ?? null,
      },
    });
    res.json(atualizada);
  }),
);

// -------- Série de pênaltis (shootout pênalti a pênalti) -----------------

const penaltisSerieSchema = z.object({
  serie: z
    .array(
      z.object({
        time: z.enum(['M', 'V']),
        converteu: z.boolean(),
        jogadorId: z.number().int().nullable().optional(),
      }),
    )
    .max(50)
    .nullable(),
});

sumulaRouter.put(
  '/partidas/:id/penaltis-serie',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const { serie } = penaltisSerieSchema.parse(req.body);
    const penM = serie == null ? null : serie.filter((s) => s.time === 'M' && s.converteu).length;
    const penV = serie == null ? null : serie.filter((s) => s.time === 'V' && s.converteu).length;
    const atualizada = await prisma.partida.update({
      where: { id: p.id },
      data: {
        penaltisSerie: serie,
        penaltisMandante: penM,
        penaltisVisitante: penV,
      },
    });
    res.json(atualizada);
  }),
);

// -------- Fechar placar (sem tocar em gols/cartões granulares) ----------

const placarSchema = z.object({
  golsMandante: z.number().int().min(0).max(99),
  golsVisitante: z.number().int().min(0).max(99),
  prorrogacao: z.boolean().optional(),
  golsMandanteProrr: z.number().int().min(0).max(99).nullable().optional(),
  golsVisitanteProrr: z.number().int().min(0).max(99).nullable().optional(),
  penaltisMandante: z.number().int().min(0).max(99).nullable().optional(),
  penaltisVisitante: z.number().int().min(0).max(99).nullable().optional(),
});

sumulaRouter.put(
  '/partidas/:id/placar',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = placarSchema.parse(req.body);
    res.json(await fecharPlacar(p.id, data));
  }),
);

// -------- Stats por time (bulk set) ---------------------------------------

const CHAVES_STAT = [
  'FINALIZACOES',
  'FINALIZACOES_NO_GOL',
  'ESCANTEIOS',
  'FALTAS',
  'IMPEDIMENTOS',
  'POSSE',
];

const statsSchema = z.object({
  stats: z.array(
    z.object({
      timeId: z.number().int(),
      chave: z.enum(CHAVES_STAT),
      valor: z.number().int().min(0).max(10000),
    }),
  ),
});

sumulaRouter.put(
  '/partidas/:id/stats',
  asyncHandler(async (req, res) => {
    const p = await carregarPartidaEditavel(req);
    const data = statsSchema.parse(req.body);
    for (const s of data.stats) validarTimeDaPartida(p, s.timeId);

    await prisma.$transaction([
      prisma.statPartida.deleteMany({ where: { partidaId: p.id } }),
      prisma.statPartida.createMany({
        data: data.stats.map((s) => ({ partidaId: p.id, ...s })),
      }),
    ]);
    const atual = await prisma.statPartida.findMany({ where: { partidaId: p.id } });
    res.json(atual);
  }),
);

// -------- Arbitragem (atribui árbitros por email; só o dono pode) --------

const arbitragemSchema = z.object({
  juizEmail: z.string().email().nullable().optional(),
  assistente1Email: z.string().email().nullable().optional(),
  assistente2Email: z.string().email().nullable().optional(),
  quartoArbitroEmail: z.string().email().nullable().optional(),
  varEmail: z.string().email().nullable().optional(),
  avarEmail: z.string().email().nullable().optional(),
  avar2Email: z.string().email().nullable().optional(),
  observadorVarEmail: z.string().email().nullable().optional(),
});

sumulaRouter.put(
  '/partidas/:id/arbitragem',
  asyncHandler(async (req, res) => {
    const partidaId = Number(req.params.id);
    const p = await carregarPartidaComAuth(partidaId);
    assertDonoDoCampeonato(req.userId, p);
    const data = arbitragemSchema.parse(req.body);

    const [juiz, a1, a2, q, v, avar, avar2, obs] = await Promise.all([
      usuarioPorEmail(data.juizEmail ?? null),
      usuarioPorEmail(data.assistente1Email ?? null),
      usuarioPorEmail(data.assistente2Email ?? null),
      usuarioPorEmail(data.quartoArbitroEmail ?? null),
      usuarioPorEmail(data.varEmail ?? null),
      usuarioPorEmail(data.avarEmail ?? null),
      usuarioPorEmail(data.avar2Email ?? null),
      usuarioPorEmail(data.observadorVarEmail ?? null),
    ]);

    const atualizada = await prisma.partida.update({
      where: { id: p.id },
      data: {
        juizId: juiz?.id ?? null,
        assistente1Id: a1?.id ?? null,
        assistente2Id: a2?.id ?? null,
        quartoArbitroId: q?.id ?? null,
        varId: v?.id ?? null,
        avarId: avar?.id ?? null,
        avar2Id: avar2?.id ?? null,
        observadorVarId: obs?.id ?? null,
      },
    });
    res.json(atualizada);
  }),
);

// -------- Auxiliares (co-editores da súmula, por email ou username) -----

const auxSchema = z.object({
  identificador: z.string().min(1).max(200),
});

async function usuarioPorIdentificador(ident) {
  const lower = ident.trim().toLowerCase();
  if (lower.includes('@')) {
    const u = await prisma.usuario.findFirst({ where: { email: { equals: lower, mode: 'insensitive' } } });
    if (!u) throw badRequest('Usuário não encontrado com esse email');
    return u;
  }
  const u = await prisma.usuario.findFirst({ where: { username: { equals: lower, mode: 'insensitive' } } });
  if (!u) throw badRequest('Usuário não encontrado com esse username');
  return u;
}

sumulaRouter.post(
  '/partidas/:id/auxiliares',
  asyncHandler(async (req, res) => {
    const partidaId = Number(req.params.id);
    const p = await carregarPartidaComAuth(partidaId);
    await assertPermissaoCampeonato(req.userId, p.campeonatoId, 'sumula');
    const { identificador } = auxSchema.parse(req.body);
    const u = await usuarioPorIdentificador(identificador);
    await prisma.partidaAuxiliar.upsert({
      where: { partidaId_usuarioId: { partidaId, usuarioId: u.id } },
      create: { partidaId, usuarioId: u.id },
      update: {},
    });
    res.status(201).json({ partidaId, usuarioId: u.id, email: u.email, nome: u.nome, username: u.username });
  }),
);

sumulaRouter.delete(
  '/partidas/:id/auxiliares/:usuarioId',
  asyncHandler(async (req, res) => {
    const partidaId = Number(req.params.id);
    const usuarioId = Number(req.params.usuarioId);
    const p = await carregarPartidaComAuth(partidaId);
    await assertPermissaoCampeonato(req.userId, p.campeonatoId, 'sumula');
    await prisma.partidaAuxiliar.delete({
      where: { partidaId_usuarioId: { partidaId, usuarioId } },
    });
    res.status(204).end();
  }),
);
