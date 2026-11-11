import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
if (!SECRET) throw new Error('JWT_SECRET não definido — copie backend/.env.example para .env');

export function sign(usuarioId) {
  return jwt.sign({ sub: String(usuarioId) }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verify(token) {
  const payload = jwt.verify(token, SECRET);
  return Number(payload.sub);
}
