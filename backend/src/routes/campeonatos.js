import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { gerarRodadas, listarRodadas } from '../services/partida.js';

export const campeonatosRouter = Router();

const CRITERIOS = ['saldo', 'golsPro', 'golsContra', 'vitorias', 'sorteio'];

const playoffSchema = z.object({
  posicoes: z.array(z.number().int().min(1)).min(2),
  chaveamento: z.array(z.tuple([z.number().int().min(1), z.number().int().min(1)])).min(1),
  temFinal: z.boolean().optional(),
  idaVolta: z.boolean().optional(),
  desempate: z.enum(['PENALTIS', 'PRORROGACAO_PENALTIS']).optional(),
});

const faixaTabelaSchema = z
  .object({
    cor: z.string().min(1).max(40),
    posInicio: z.number().int().min(1),
    posFim: z.number().int().min(1),
    legenda: z.string().max(200),
  })
  .refine((f) => f.posFim >= f.posInicio, { message: 'posFim deve ser >= posInicio' });

const campeonatoSchema = z.object({
  nome: z.string().min(1).max(200),
  formato: z
    .enum(['PONTOS_CORRIDOS', 'MATA_MATA', 'GRUPOS', 'GRUPOS_MATA_MATA', 'PONTOS_CORRIDOS_MATA_MATA'])
    .optional(),
  pontosVitoria: z.number().int().min(0).max(10).optional(),
  pontosEmpate: z.number().int().min(0).max(10).optional(),
  idaVolta: z.boolean().optional(),
  koDesempate: z.enum(['PENALTIS', 'PRORROGACAO_PENALTIS']).optional(),
  numGrupos: z.number().int().min(2).max(32).nullable().optional(),
  avancamPorGrupo: z.number().int().min(1).max(10).nullable().optional(),
  criteriosDesempate: z.array(z.enum(CRITERIOS)).max(CRITERIOS.length).nullable().optional(),
  playoff: playoffSchema.nullable().optional(),
  faixasTabela: z.array(faixaTabelaSchema).max(20).nullable().optional(),
  campeonatoVinculadoId: z.number().int().positive().nullable().optional(),
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
    numGrupos: c.numGrupos,
    avancamPorGrupo: c.avancamPorGrupo,
    criteriosDesempate: c.criteriosDesempate,
    playoff: c.playoff,
    faixasTabela: c.faixasTabela,
    campeonatoVinculadoId: c.campeonatoVinculadoId,
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

async function resolverVinculo(usuarioId, vinculadoId, selfId) {
  if (vinculadoId == null) return vinculadoId;
  if (vinculadoId === selfId) throw notFound('Campeonato não pode se vincular a si mesmo');
  const alvo = await prisma.campeonato.findFirst({ where: { id: vinculadoId, usuarioId } });
  if (!alvo) throw notFound('Campeonato vinculado não encontrado');
  return vinculadoId;
}

campeonatosRouter.use(authRequired);

campeonatosRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lista = await prisma.campeonato.findMany({
      where: { usuarioId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { inscricoes: true } } },
    });
    const campeonatos = lista.map((c) => toCampDto(c, c._count.inscricoes));
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
    const qtdTimes = await prisma.inscricaoCampeonato.count({ where: { campeonatoId: id } });
    res.json(toCampDto(c, qtdTimes));
  }),
);

campeonatosRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = campeonatoSchema.parse(req.body);
    const formato = data.formato ?? 'PONTOS_CORRIDOS';
    const temGrupos = formato === 'GRUPOS' || formato === 'GRUPOS_MATA_MATA';
    const numGrupos = temGrupos ? (data.numGrupos ?? 2) : null;
    const vinculadoId = await resolverVinculo(req.userId, data.campeonatoVinculadoId ?? null, null);

    const c = await prisma.campeonato.create({
      data: {
        usuarioId: req.userId,
        nome: data.nome.trim(),
        formato,
        pontosVitoria: data.pontosVitoria ?? 3,
        pontosEmpate: data.pontosEmpate ?? 1,
        idaVolta: data.idaVolta ?? false,
        koDesempate: data.koDesempate ?? 'PENALTIS',
        numGrupos,
        avancamPorGrupo: temGrupos ? (data.avancamPorGrupo ?? 2) : null,
        criteriosDesempate: data.criteriosDesempate ?? undefined,
        playoff: data.playoff ?? undefined,
        faixasTabela: data.faixasTabela ?? undefined,
        campeonatoVinculadoId: vinculadoId,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        descricao: data.descricao ?? null,
        logoUrl: data.logoUrl ?? null,
      },
    });

    if (temGrupos) {
      const nomes = Array.from({ length: numGrupos }, (_, i) => String.fromCharCode(65 + i));
      await prisma.grupo.createMany({ data: nomes.map((nome) => ({ campeonatoId: c.id, nome })) });
    }

    res.status(201).json(toCampDto(c, 0));
  }),
);

campeonatosRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const data = campeonatoSchema.parse(req.body);
    const vinculadoId =
      data.campeonatoVinculadoId === undefined
        ? undefined
        : await resolverVinculo(req.userId, data.campeonatoVinculadoId, id);
    const c = await prisma.campeonato.update({
      where: { id },
      data: {
        nome: data.nome.trim(),
        formato: data.formato ?? undefined,
        pontosVitoria: data.pontosVitoria ?? undefined,
        pontosEmpate: data.pontosEmpate ?? undefined,
        idaVolta: data.idaVolta ?? undefined,
        koDesempate: data.koDesempate ?? undefined,
        avancamPorGrupo: data.avancamPorGrupo ?? undefined,
        criteriosDesempate: data.criteriosDesempate === undefined ? undefined : data.criteriosDesempate,
        playoff: data.playoff === undefined ? undefined : data.playoff,
        faixasTabela: data.faixasTabela === undefined ? undefined : data.faixasTabela,
        campeonatoVinculadoId: vinculadoId,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        descricao: data.descricao ?? null,
        logoUrl: data.logoUrl ?? null,
      },
    });
    const qtdTimes = await prisma.inscricaoCampeonato.count({ where: { campeonatoId: id } });
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

const SECOES_SUMULA = [
  'arbitragem', 'escalacao', 'cronologia', 'gols', 'cartoes', 'placar', 'observacoes',
];
const sumulaConfigSchema = z.object({
  secoes: z.record(z.enum(SECOES_SUMULA), z.boolean()).default({}),
  subsecoes: z.record(z.string().max(60), z.boolean()).default({}),
  camposCustom: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, 'id inválido'),
        label: z.string().min(1).max(60),
        tipo: z.enum(['texto', 'numero', 'boolean']),
      }),
    )
    .max(30)
    .default([]),
}).refine(
  (c) => new Set(c.camposCustom.map((f) => f.id)).size === c.camposCustom.length,
  { message: 'ids de campos custom devem ser únicos' },
);

function defaultSumulaConfig() {
  return { secoes: {}, subsecoes: {}, camposCustom: [] };
}

campeonatosRouter.get(
  '/:id/sumula-config',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const c = await getOwned(req.userId, id);
    res.json(c.sumulaConfig ?? defaultSumulaConfig());
  }),
);

campeonatosRouter.put(
  '/:id/sumula-config',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const data = sumulaConfigSchema.parse(req.body);
    const c = await prisma.campeonato.update({
      where: { id },
      data: { sumulaConfig: data },
    });
    res.json(c.sumulaConfig);
  }),
);

// Times inscritos no campeonato (via InscricaoCampeonato).
campeonatosRouter.get(
  '/:id/times',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const inscr = await prisma.inscricaoCampeonato.findMany({
      where: { campeonatoId: id },
      include: { time: true },
      orderBy: { time: { nome: 'asc' } },
    });
    res.json(inscr.map((i) => ({ ...i.time, grupoId: i.grupoId, inscricaoId: i.id })));
  }),
);

const inscricaoSchema = z.object({
  timeId: z.number().int(),
  grupoId: z.number().int().nullable().optional(),
});

async function assertGrupoDoCampeonato(campeonatoId, grupoId) {
  if (grupoId == null) return;
  const g = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!g || g.campeonatoId !== campeonatoId) throw notFound('Grupo não encontrado neste campeonato');
}

async function assertTimeDoUsuario(usuarioId, timeId) {
  const t = await prisma.time.findUnique({ where: { id: timeId } });
  if (!t || t.usuarioId !== usuarioId) throw notFound('Time não encontrado');
  return t;
}

// Inscreve um time já cadastrado no campeonato.
campeonatosRouter.post(
  '/:id/inscricoes',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const data = inscricaoSchema.parse(req.body);
    await assertTimeDoUsuario(req.userId, data.timeId);
    await assertGrupoDoCampeonato(id, data.grupoId);
    const i = await prisma.inscricaoCampeonato.upsert({
      where: { campeonatoId_timeId: { campeonatoId: id, timeId: data.timeId } },
      update: { grupoId: data.grupoId ?? null },
      create: { campeonatoId: id, timeId: data.timeId, grupoId: data.grupoId ?? null },
    });
    res.status(201).json(i);
  }),
);

// Desinscreve um time do campeonato.
campeonatosRouter.delete(
  '/:id/inscricoes/:timeId',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const timeId = Number(req.params.timeId);
    await getOwned(req.userId, id);
    await prisma.inscricaoCampeonato.deleteMany({ where: { campeonatoId: id, timeId } });
    res.status(204).end();
  }),
);

campeonatosRouter.get(
  '/:id/grupos',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const grupos = await prisma.grupo.findMany({
      where: { campeonatoId: id },
      orderBy: { nome: 'asc' },
      include: { inscricoes: { include: { time: true } } },
    });
    res.json(grupos.map((g) => ({
      id: g.id,
      campeonatoId: g.campeonatoId,
      nome: g.nome,
      times: g.inscricoes.map((i) => i.time).sort((a, b) => a.nome.localeCompare(b.nome)),
    })));
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

const arbitroSchema = z.object({
  email: z.string().email().max(200),
  nome: z.string().max(200).nullable().optional(),
});

async function resolverArbitroUsuario(email) {
  const u = await prisma.usuario.findUnique({ where: { email } });
  return u ? { usuarioId: u.id, nome: u.nome } : null;
}

campeonatosRouter.get(
  '/:id/arbitros',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const lista = await prisma.arbitroCampeonato.findMany({
      where: { campeonatoId: id },
      orderBy: { id: 'asc' },
    });
    // tenta resolver usuarioId para pendentes
    const pendentes = lista.filter((a) => !a.usuarioId);
    for (const a of pendentes) {
      const r = await resolverArbitroUsuario(a.email);
      if (r) {
        await prisma.arbitroCampeonato.update({ where: { id: a.id }, data: { usuarioId: r.usuarioId, nome: a.nome ?? r.nome } });
        a.usuarioId = r.usuarioId;
        a.nome = a.nome ?? r.nome;
      }
    }
    res.json(lista.map((a) => ({ id: a.id, email: a.email, nome: a.nome, usuarioId: a.usuarioId, status: a.usuarioId ? 'ACEITO' : 'PENDENTE' })));
  }),
);

campeonatosRouter.post(
  '/:id/arbitros',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await getOwned(req.userId, id);
    const data = arbitroSchema.parse(req.body);
    const existente = await prisma.arbitroCampeonato.findUnique({
      where: { campeonatoId_email: { campeonatoId: id, email: data.email } },
    });
    if (existente) return res.json({ id: existente.id, email: existente.email, nome: existente.nome, usuarioId: existente.usuarioId, status: existente.usuarioId ? 'ACEITO' : 'PENDENTE' });
    const resolvido = await resolverArbitroUsuario(data.email);
    const criado = await prisma.arbitroCampeonato.create({
      data: {
        campeonatoId: id,
        email: data.email,
        nome: data.nome ?? resolvido?.nome ?? null,
        usuarioId: resolvido?.usuarioId ?? null,
      },
    });
    res.status(201).json({ id: criado.id, email: criado.email, nome: criado.nome, usuarioId: criado.usuarioId, status: criado.usuarioId ? 'ACEITO' : 'PENDENTE' });
  }),
);

campeonatosRouter.delete(
  '/:id/arbitros/:arbitroId',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const arbitroId = Number(req.params.arbitroId);
    await getOwned(req.userId, id);
    await prisma.arbitroCampeonato.deleteMany({ where: { id: arbitroId, campeonatoId: id } });
    res.status(204).end();
  }),
);
