import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join('; ');
    return res.status(400).json({ message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ message: 'Registro duplicado' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: 'Não encontrado' });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Erro interno' });
}
