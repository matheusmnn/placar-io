import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hash, compare } from '../lib/hash.js';
import { sign } from '../lib/jwt.js';
import { asyncHandler, conflict, unauthorized } from '../lib/http.js';

export const authRouter = Router();

const registerSchema = z.object({
  nome: z.string().min(1).max(120),
  email: z.string().email(),
  senha: z.string().min(6).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { nome, email, senha } = registerSchema.parse(req.body);
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) throw conflict('Email já cadastrado');
    const usuario = await prisma.usuario.create({
      data: { nome, email, senhaHash: await hash(senha) },
    });
    res.status(201).json({
      token: sign(usuario.id),
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, isSuperAdmin: usuario.isSuperAdmin },
    });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body);
    const u = await prisma.usuario.findUnique({ where: { email } });
    if (!u || !(await compare(senha, u.senhaHash))) throw unauthorized('Credenciais inválidas');
    res.json({
      token: sign(u.id),
      usuario: { id: u.id, nome: u.nome, email: u.email, isSuperAdmin: u.isSuperAdmin },
    });
  }),
);
