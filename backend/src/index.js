import express from 'express';
import cors from 'cors';
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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  }),
);
app.use(pinoHttp({ logger: log }));
app.use(authOptional);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/public', publicoRouter);
app.use('/api/campeonatos', campeonatosRouter);
app.use('/api/times', timesRouter);
app.use('/api/jogadores', jogadoresRouter);
app.use('/api/partidas', partidasRouter);
app.use('/api/comissao', comissaoRouter);
app.use('/api', sumulaRouter); // paths absolutos: /partidas/:id/gols, /gols/:id, etc.

app.use(errorHandler);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => log.info({ port }, 'ready'));
