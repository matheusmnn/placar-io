# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Monorepo for placar.io — gerenciador de campeonatos amadores de futebol.

- `backend/` — Node 20 + Express + Prisma + Postgres, **plain JavaScript (ESM)**, not TypeScript. Keep it that way.
- `frontend/` — React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui (Radix + CVA), React Router v7.

## Commands

### Backend (`cd backend`)

```bash
npm install
cp .env.example .env                 # set DATABASE_URL + JWT_SECRET
npx prisma db push                   # apply schema without migrations (dev)
npx prisma db push --force-reset     # wipe DB and reapply (destructive)
npx prisma studio                    # web UI for the DB on :5555
npm start                            # express on :8080
npm run dev                          # node --watch (reload on file change)
npm test                             # all node:test files
node --test src/services/chaveamento.test.js   # run a single test file
```

### Frontend (`cd frontend`)

```bash
npm install
npm run dev                          # vite on :5173
npm run build                        # production build in dist/
npx tsc -b                           # type check without emitting (use this to validate)
```

No lint command is wired yet; `tsc -b` is the only automated check for the frontend. Backend has no linter either; `node --check <file>` for syntax.

## Architecture

### Championship format is a dispatch

`backend/src/services/partida.js` is the central dispatcher. Format-specific logic branches off `Campeonato.formato`:

- `PONTOS_CORRIDOS` — flat round-robin (`chaveamento.pontosCorridos`), closes with `verificarEncerramento`.
- `MATA_MATA` — potência-de-2 bracket (`chaveamento.mataMataPrimeiraFase`); advance with `verificarAvancoMataMata`, which uses `resolverConfronto` from `confronto.js` to pick the winner from aggregate → prorrogação → pênaltis.
- `GRUPOS` — round-robin per `Grupo`, closes when all group matches done.
- `GRUPOS_MATA_MATA` — groups then KO. `verificarAvancoGrupos` watches group stage completion, uses `emparelhamentoCross` from `grupos.js` to pair the top N from each group, then creates the first KO phase.
- `PONTOS_CORRIDOS_MATA_MATA` — league then playoff. `verificarAvancoPlayoff` watches league completion, builds the first playoff round from `Campeonato.playoff` JSON config via `construirPlayoff` from `playoff.js`.

Pure helpers (fully unit-tested, no Prisma): `chaveamento.js`, `classificacao.js`, `confronto.js`, `grupos.js`, `playoff.js`. Keep new format logic in these when you can.

### Partida has many disjoint flags that encode phase

A single `Partida` row carries format semantics via a mix of nullable fields; respect this:

- `grupoId != null` — fase de grupos
- `fase != null` — KO phase (mata-mata, or playoff in PCMM)
- `legOrdem != null` — KO leg in ida+volta; same `(rodada, ordemFase)` pair identifies a confronto
- `grupoId == null && fase == null` — pontos corridos regular

`verificarAvancoMataMata` filters `grupoId: null, NOT: { fase: null }` because both groups+KO and PCMM can share rodada numbers between phases. Preserve those filters.

### Súmula CBF-style is CRUD granular + one "close" call

`PUT /partidas/:id/resultado` (the old path) still works as a lot (overwrites gols/cartões on every call). The new path is granular:

- `POST/PUT/DELETE /partidas/:id/gols` etc. — each event is its own row
- `PUT /partidas/:id/escalacao` — bulk replace of titulares/reservas
- `PUT /partidas/:id/placar` — closes the match without touching granular events

Do not call `/resultado` in the same flow as the granular endpoints: it wipes events.

Permissions flow through `services/permissoes.js`:
- `assertDonoDoCampeonato` — campeonato owner only (used for `/arbitragem`, `/auxiliares`)
- `assertPodeEditarSumula` — owner + `Partida.juizId` + anyone in `PartidaAuxiliar` (used for all sumula CRUD)

### HTTP contract is the source of truth

`frontend/src/lib/api.ts` is the authoritative TypeScript definition of the backend contract. When adding a route, update it in both places or the frontend breaks silently at runtime.

Routes are mounted in `backend/src/index.js`. Note: `sumulaRouter` is mounted at `/api` with absolute paths (`/partidas/:id/gols`, `/gols/:id`) because it spans multiple resources; other routers mount under their resource prefix.

### Prisma schema is the source of truth for the model

Any domain change goes through `backend/prisma/schema.prisma`. After editing:

```bash
npx prisma db push          # dev: just apply, no history
npx prisma generate         # regen client (db push does this too)
```

In production we would switch to `prisma migrate deploy` with versioned migrations. Not yet.

### Frontend conventions

- All colors come from shadcn tokens: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `text-destructive`. Hardcoded `bg-gray-*`, `bg-green-*` etc. will not switch themes correctly.
- Dark mode is the default and lives in `lib/theme.tsx` (`ThemeProvider`). The toggle is in `OrganizerLayout` header.
- Shadcn `<Select>` is used almost everywhere; a few places use native `<select>` where the shadcn one was overkill.
- Session state (campeonato ativo, time ativo, partida ativa) is kept in `lib/session.ts` in-memory + localStorage. Screens read it to know what they're editing.

## Gotchas

- Backend is **ESM** (`"type": "module"` in package.json). Imports must include the `.js` extension (`import { foo } from './bar.js'`).
- Tests import via Node's built-in `node:test` and `node:assert/strict` — no Jest, no Vitest.
- CORS origin is read from `CORS_ORIGIN` env (comma-separated). In production this must match the frontend URL exactly or the browser blocks requests.
- `VITE_API_URL` is baked into the frontend build. Changing it requires a rebuild on the frontend side.

-Nunca colocar o claude como contribuidor do repositório no github