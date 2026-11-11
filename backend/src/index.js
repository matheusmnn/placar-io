import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { authOptional } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { campeonatosRouter } from './routes/campeonatos.js';
import { timesRouter } from './routes/times.js';
import { jogadoresRouter } from './routes/jogadores.js';
import { partidasRouter } from './routes/partidas.js';
import { publicoRouter } from './routes/publico.js';
import { sumulaRouter } from './routes/sumula.js';
import { comissaoRouter } from './routes/comissao.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const prod = process.env.NODE_ENV === 'production';
const PLACEHOLDERS = new Set(['', 'changeme', 'secret', 'troque-isto-em-producao-base64']);
const secret = process.env.JWT_SECRET ?? '';
if (prod && (secret.length < 32 || PLACEHOLDERS.has(secret))) {
  log.fatal('JWT_SECRET ausente, muito curto ou valor placeholder em produção.');
  process.exit(1);
}
if (!prod && secret.length < 32) {
  log.warn('JWT_SECRET curto — tolerado em dev, obrigatório >= 32 chars em produção.');
}
if (prod && !process.env.CORS_ORIGIN) {
  log.fatal('CORS_ORIGIN é obrigatório em produção.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // essencial pro rate limit atrás de proxy (Render/Railway/etc)
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  }),
);
app.use(pinoHttp({ logger: log }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use(authOptional);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/public', apiLimiter, publicoRouter);
app.use('/api/campeonatos', apiLimiter, campeonatosRouter);
app.use('/api/times', apiLimiter, timesRouter);
app.use('/api/jogadores', apiLimiter, jogadoresRouter);
app.use('/api/partidas', apiLimiter, partidasRouter);
app.use('/api/comissao', apiLimiter, comissaoRouter);
app.use('/api', apiLimiter, sumulaRouter); // paths absolutos: /partidas/:id/gols, /gols/:id, etc.

app.use(errorHandler);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => log.info({ port }, 'ready'));
