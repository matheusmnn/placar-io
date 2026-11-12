import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../lib/http.js';

export const usuariosRouter = Router();

const buscaLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `busca:${req.userId ?? req.ip}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Busca excedeu o limite. Aguarde um instante.' },
});

usuariosRouter.use(authRequired);

usuariosRouter.get(
  '/buscar',
  buscaLimiter,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    if (q.length < 3) return res.json([]);
    const lista = await prisma.usuario.findMany({
      where: { username: { startsWith: q, mode: 'insensitive' } },
      select: { id: true, username: true, nome: true },
      take: 5,
      orderBy: { username: 'asc' },
    });
    res.json(lista.map((u) => ({ usuarioId: u.id, username: u.username, nome: u.nome })));
  }),
);
