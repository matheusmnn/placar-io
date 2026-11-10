import { verify } from '../lib/jwt.js';

export function authOptional(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.userId = verify(header.slice(7));
    } catch {
      /* token inválido: segue anônimo */
    }
  }
  next();
}

export function authRequired(req, res, next) {
  if (!req.userId) return res.status(401).json({ message: 'Não autenticado' });
  next();
}
