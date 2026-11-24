import { prisma } from '../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../lib/http.js';

export const ESCOPOS_COADM = ['gerenciar', 'elenco', 'calendario', 'sumula', 'coAdms', 'excluir'];

export function permissoesTudoMarcado() {
  return Object.fromEntries(ESCOPOS_COADM.map((k) => [k, true]));
}

export function normalizarPermissoes(input) {
  const obj = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(ESCOPOS_COADM.map((k) => [k, obj[k] === true]));
}

// Lógica pura. `camp` precisa ter usuarioId. `adminRow` é a linha de CampeonatoAdmin (ou null).
// `usuario` precisa ter id e isSuperAdmin.
export function temPermissaoCampeonato(camp, adminRow, usuario, escopo) {
  if (!usuario || typeof usuario.id !== 'number') return false;
  if (usuario.isSuperAdmin) return true;
  if (camp.usuarioId === usuario.id) return true;
  const p = adminRow?.permissoes;
  return !!p && p[escopo] === true;
}

// Carrega campeonato + adminRow + usuário e asserta permissão. Não vaza existência:
// qualquer falha vira notFound.
export async function assertPermissaoCampeonato(usuarioId, campeonatoId, escopo) {
  if (!usuarioId) throw forbidden('Não autenticado');
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, isSuperAdmin: true },
  });
  if (!usuario) throw forbidden('Não autenticado');
  const camp = await prisma.campeonato.findUnique({ where: { id: campeonatoId } });
  if (!camp) throw notFound('Campeonato não encontrado');
  const adminRow = await prisma.campeonatoAdmin.findUnique({
    where: { campeonatoId_usuarioId: { campeonatoId, usuarioId } },
  });
  if (!temPermissaoCampeonato(camp, adminRow, usuario, escopo)) {
    throw notFound('Campeonato não encontrado');
  }
  return { camp, usuario, adminRow };
}

// Leitura: qualquer membro (dono, super, ou qualquer co-adm) vê.
export async function assertLeituraCampeonato(usuarioId, campeonatoId) {
  if (!usuarioId) throw forbidden('Não autenticado');
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, isSuperAdmin: true },
  });
  if (!usuario) throw forbidden('Não autenticado');
  const camp = await prisma.campeonato.findUnique({ where: { id: campeonatoId } });
  if (!camp) throw notFound('Campeonato não encontrado');
  if (usuario.isSuperAdmin || camp.usuarioId === usuario.id) return { camp, usuario };
  const adminRow = await prisma.campeonatoAdmin.findUnique({
    where: { campeonatoId_usuarioId: { campeonatoId, usuarioId } },
  });
  if (!adminRow) throw notFound('Campeonato não encontrado');
  return { camp, usuario, adminRow };
}

export function podeSerConvidado(camp, alvoUsuario, adminExistente) {
  if (alvoUsuario.id === camp.usuarioId) return { ok: false, motivo: 'eh-o-dono' };
  if (adminExistente) return { ok: false, motivo: 'ja-eh-co-adm' };
  return { ok: true };
}

export function podeEditarPermissoesDe(reqUser, alvoUsuarioId) {
  return reqUser.id !== alvoUsuarioId;
}

export async function carregarPartidaComAuth(partidaId) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: {
      campeonato: { select: { usuarioId: true, status: true } },
      auxiliares: { select: { usuarioId: true } },
    },
  });
  if (!p) throw notFound('Partida não encontrada');
  return p;
}

// Registrar jogo exige o campeonato iniciado (trava de estado, não de permissão).
export function assertCampeonatoIniciado(partida) {
  if (partida.campeonato.status === 'NAO_INICIADO') {
    throw badRequest('Inicie o campeonato antes de registrar os jogos');
  }
}

// Dono do campeonato pode tudo. Juiz e auxiliares podem editar a súmula daquela partida.
export function assertPodeEditarSumula(usuarioId, partida) {
  if (!usuarioId) throw forbidden('Não autenticado');
  const dono = partida.campeonato.usuarioId === usuarioId;
  const juiz = partida.juizId === usuarioId;
  const aux = partida.auxiliares.some((a) => a.usuarioId === usuarioId);
  if (!dono && !juiz && !aux) throw forbidden('Você não tem permissão pra editar essa súmula');
  assertCampeonatoIniciado(partida);
}

// Só o dono do campeonato pode atribuir árbitros (juiz e auxiliares).
export function assertDonoDoCampeonato(usuarioId, partida) {
  if (!usuarioId) throw forbidden('Não autenticado');
  if (partida.campeonato.usuarioId !== usuarioId) throw forbidden('Só o organizador pode fazer isso');
}
