import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

export function sign(usuarioId) {
  return jwt.sign({ sub: String(usuarioId) }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verify(token) {
  const payload = jwt.verify(token, SECRET);
  return Number(payload.sub);
}
