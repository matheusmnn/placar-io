import { prisma } from '../lib/prisma.js';
import { forbidden, notFound } from '../lib/http.js';

export async function carregarPartidaComAuth(partidaId) {
  const p = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: {
      campeonato: { select: { usuarioId: true } },
      auxiliares: { select: { usuarioId: true } },
    },
  });
  if (!p) throw notFound('Partida não encontrada');
  return p;
}

// Dono do campeonato pode tudo. Juiz e auxiliares podem editar a súmula daquela partida.
export function assertPodeEditarSumula(usuarioId, partida) {
  if (!usuarioId) throw forbidden('Não autenticado');
  if (partida.campeonato.usuarioId === usuarioId) return;
  if (partida.juizId === usuarioId) return;
  if (partida.auxiliares.some((a) => a.usuarioId === usuarioId)) return;
  throw forbidden('Você não tem permissão pra editar essa súmula');
}

// Só o dono do campeonato pode atribuir árbitros (juiz e auxiliares).
export function assertDonoDoCampeonato(usuarioId, partida) {
  if (!usuarioId) throw forbidden('Não autenticado');
  if (partida.campeonato.usuarioId !== usuarioId) throw forbidden('Só o organizador pode fazer isso');
}
