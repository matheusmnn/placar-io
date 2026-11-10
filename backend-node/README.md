# placar-io — Backend Node (Fatia 1)

Node 20+ · Express 4 · Prisma · Postgres · JS puro.

## Setup

```bash
cp .env.example .env         # ajuste DATABASE_URL e JWT_SECRET
npm install
npx prisma migrate dev --name init
npm start                    # escuta em :8080
npm test                     # testes do chaveamento
```

## Rotas implementadas

Espelham o contrato que o `frontend/src/lib/api.ts` já consome.

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/campeonatos`, `GET/PUT/DELETE /api/campeonatos/:id`
- `GET/POST /api/campeonatos/:id/times`, `PUT/DELETE /api/times/:id`
- `GET/POST /api/times/:id/jogadores`, `PUT/DELETE /api/jogadores/:id`
- `POST /api/campeonatos/:id/gerar-rodadas`, `GET /api/campeonatos/:id/partidas`
- `GET /api/partidas/:id`, `PUT /api/partidas/:id/resultado`
- `GET /api/public/campeonatos`, `GET /api/public/campeonatos/:id`
- `GET /api/public/campeonatos/:id/classificacao|artilharia|rodadas`

## O que está em escopo até aqui (Fatia 2)

- Formatos: `PONTOS_CORRIDOS` (ida ou ida+volta) e `MATA_MATA` (jogo único **ou ida+volta**, bye em potência de 2).
- **Mata-mata**: `Campeonato.idaVolta` também vale pra KO; `Campeonato.koDesempate` define `PENALTIS` (direto) ou `PRORROGACAO_PENALTIS`. Em ida+volta, cada par vira 2 partidas (`legOrdem` 1 e 2, mesma `ordemFase`); a resolução usa agregado → prorrogação (se habilitada) → pênaltis.
- Permissão: owner-only (mesmo modelo do Spring).
- Súmula: lote por `PUT /partidas/:id/resultado`, agora aceitando `prorrogacao`, `golsMandanteProrr/Visitante`, `penaltisMandante/Visitante`.

Após mudar o schema, aplicar com `npx prisma db push` de novo.

Fatias seguintes: grupos e híbridos, critérios de desempate configuráveis, playoff dinâmico, juiz delegado com súmula granular, stats, tema escuro.
