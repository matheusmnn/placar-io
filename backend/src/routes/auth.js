import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hash, compare } from '../lib/hash.js';
import { sign } from '../lib/jwt.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, badRequest, conflict, unauthorized } from '../lib/http.js';

export const authRouter = Router();

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const USERNAME_RESERVADOS = new Set(['admin', 'root', 'placar', 'api', 'null', 'undefined']);

function validarUsername(raw) {
  const u = String(raw ?? '').trim().toLowerCase();
  if (!USERNAME_REGEX.test(u)) throw badRequest('Username deve ter 3–20 chars, apenas a-z, 0-9 e _');
  if (USERNAME_RESERVADOS.has(u)) throw badRequest('Username reservado');
  return u;
}

function usuarioDto(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    username: u.username,
    isSuperAdmin: u.isSuperAdmin,
  };
}

const registerSchema = z.object({
  nome: z.string().min(1).max(120),
  email: z.string().email(),
  senha: z.string().min(6).max(200),
  username: z.string().min(3).max(20),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

const escolherUsernameSchema = z.object({ username: z.string().min(3).max(20) });

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.parse(req.body);
    const username = validarUsername(parsed.username);
    const [existeEmail, existeUsername] = await Promise.all([
      prisma.usuario.findUnique({ where: { email: parsed.email } }),
      prisma.usuario.findUnique({ where: { username } }),
    ]);
    if (existeEmail) throw conflict('Email já cadastrado');
    if (existeUsername) throw conflict('Username já em uso');
    const usuario = await prisma.usuario.create({
      data: { nome: parsed.nome, email: parsed.email, username, senhaHash: await hash(parsed.senha) },
    });
    res.status(201).json({ token: sign(usuario.id), usuario: usuarioDto(usuario) });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body);
    const u = await prisma.usuario.findUnique({ where: { email } });
    if (!u || !(await compare(senha, u.senhaHash))) throw unauthorized('Credenciais inválidas');
    res.json({ token: sign(u.id), usuario: usuarioDto(u) });
  }),
);

authRouter.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const u = await prisma.usuario.findUnique({ where: { id: req.userId } });
    if (!u) throw unauthorized('Sessão inválida');
    res.json({ usuario: usuarioDto(u) });
  }),
);

authRouter.post(
  '/escolher-username',
  authRequired,
  asyncHandler(async (req, res) => {
    const { username: raw } = escolherUsernameSchema.parse(req.body);
    const username = validarUsername(raw);
    const u = await prisma.usuario.findUnique({ where: { id: req.userId } });
    if (!u) throw unauthorized('Sessão inválida');
    if (u.username) throw conflict('Usuário já tem username');
    const ocupado = await prisma.usuario.findUnique({ where: { username } });
    if (ocupado) throw conflict('Username já em uso');
    const atualizado = await prisma.usuario.update({ where: { id: req.userId }, data: { username } });
    res.json({ usuario: usuarioDto(atualizado) });
  }),
);
