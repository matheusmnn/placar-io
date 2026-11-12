# Convite de co-adm + username único — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir que o dono de um campeonato convide outros usuários como co-adm com escopos de permissão granulares, e introduzir `username` único por usuário como identificador público usado no convite.

**Architecture:** uma tabela `CampeonatoAdmin` por linha (usuário, campeonato, flags JSON); função pura `temPermissaoCampeonato(camp, adminRow, usuarioId, escopo)` substitui o atual `getOwned` em `campeonatos.js` e deriva autorização de cada rota administrativa. Username é opcional no schema (nullable) e o frontend força a escolha numa tela bloqueadora quando o usuário logado tem `username == null`.

**Tech Stack:** backend ESM Node 20, Express, Prisma, Postgres, Zod; frontend React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui; testes com `node:test` só em lógica pura.

**Spec:** [docs/superpowers/specs/2026-11-12-convite-coadm-design.md](../specs/2026-11-12-convite-coadm-design.md)

## Global Constraints

- Backend é ESM: todo import local termina em `.js`.
- Migrações só via `npx prisma migrate dev --name <descritivo>` rodando dentro de `backend/`; nunca `prisma db push`.
- Rate limit do `/api/auth` fica como está (10 req/15min). Qualquer limiter novo é adicional, não substitui.
- Frontend: todas as cores via tokens shadcn (`bg-background`, `bg-card`, `text-foreground`, …). Zero `bg-gray-*`/`bg-green-*` hardcoded.
- Contrato HTTP vive em `frontend/src/lib/api.ts` — toda rota nova precisa aparecer lá como função em `export const api`.
- Validação de username: regex `^[a-z0-9_]{3,20}$`, sempre persistido em lowercase. Reservados: `admin`, `root`, `placar`, `api`, `null`, `undefined`.
- Nomes de escopo (chaves JSON): exatamente `gerenciar`, `elenco`, `calendario`, `sumula`, `coAdms`, `excluir`.
- Super admin (`Usuario.isSuperAdmin`) continua passando em qualquer check de permissão de campeonato — comportamento atual do `getOwned` preservado.

## Review Focus

Entradas que a spec implica mas que nenhum teste de unidade cobre naturalmente — cada linha tem seu teste pinado na task dona:

1. **PATCH /campeonatos/:id/co-adms/:usuarioId com `req.userId === :usuarioId`** — tem que responder 403 mesmo quando o próprio co-adm tem `coAdms: true` (sem auto-promoção). Teste na Task 4.
2. **POST /campeonatos/:id/co-adms convidando o próprio dono** — responde 400. Teste na Task 4.
3. **POST /campeonatos/:id/co-adms com `identificador` que não existe no banco** — responde 404 sem distinguir email vs. username. Teste na Task 4.
4. **Duas requests concorrentes convidando o mesmo usuário** — unique index `(campeonatoId, usuarioId)` garante que uma delas falha com P2002 e vira 409. Teste na Task 4.
5. **GET /usuarios/buscar com `q` que é email** — ignora totalmente e trata como busca por username (não retorna match por email). Teste na Task 4.

---

## File Structure

### Backend

- **Modify** `backend/prisma/schema.prisma` — campo `username` em `Usuario`, model `CampeonatoAdmin`, relação inversa em `Campeonato`.
- **Create** `backend/prisma/migrations/<timestamp>_add_username_e_coadm/migration.sql` — gerada pelo `migrate dev`.
- **Modify** `backend/src/services/permissoes.js` — função pura `temPermissaoCampeonato`, async `assertPermissaoCampeonato`, constantes.
- **Create** `backend/src/services/permissoes.test.js` — testes unitários do checker puro.
- **Modify** `backend/src/routes/auth.js` — campo `username` no schema de register, rota `POST /escolher-username`, rota `GET /me`, payload de resposta ganha `username`.
- **Modify** `backend/src/routes/campeonatos.js` — `getOwned` vira `getCampComPermissao(usuarioId, id, escopo)` chamando o novo asserter; endpoints novos de co-adms; listagem de `/` passa a incluir campeonatos onde o usuário é co-adm.
- **Create** `backend/src/routes/usuarios.js` — rota `GET /usuarios/buscar` com rate limiter próprio.
- **Modify** `backend/src/index.js` — monta `usuariosRouter`.

### Frontend

- **Modify** `frontend/src/lib/api.ts` — tipo `Usuario` ganha `username: string | null`; novos tipos `Permissoes`, `CoAdm`, `UsuarioBusca`; novos métodos `api.me`, `api.escolherUsername`, `api.buscarUsuarios`, `api.listarCoAdms`, `api.convidarCoAdm`, `api.editarCoAdm`, `api.removerCoAdm`; listagem de campeonatos ganha flag `papel`.
- **Modify** `frontend/src/components/screens/Register.tsx` — campo `username`.
- **Modify** `frontend/src/lib/useAuth.tsx` — gate: se `user.username == null`, redireciona pra `/escolher-username` em qualquer rota protegida.
- **Create** `frontend/src/components/screens/EscolherUsername.tsx` — tela bloqueadora.
- **Modify** `frontend/src/components/ProtectedRoute.tsx` — aplica gate de username.
- **Modify** `frontend/src/components/OrganizerLayout.tsx` — novo item no menu "Co-adms".
- **Create** `frontend/src/components/screens/CoAdmins.tsx` — listagem + convidar + editar + remover.
- **Modify** `frontend/src/components/screens/Dashboard.tsx` — duas seções: "Meus campeonatos" e "Campeonatos que administro".
- **Modify** `frontend/src/App.tsx` — rotas `/escolher-username` e `/campeonatos/:id/co-admins`.

---

### Task 1: Schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma:85-96` (model `Usuario`), `:98-127` (model `Campeonato`)
- Create: `backend/prisma/migrations/<timestamp>_add_username_e_coadm/migration.sql` (gerada)

**Interfaces:**
- Produces: `Usuario.username: string | null` único; `CampeonatoAdmin { id, campeonatoId, usuarioId, permissoes: Json, criadoEm, atualizadoEm }` com unique `(campeonatoId, usuarioId)` e index em `usuarioId`.

- [ ] **Step 1:** Em `backend/prisma/schema.prisma`, dentro do model `Usuario`, adicionar `username String? @unique` na linha após `email`.

- [ ] **Step 2:** No mesmo arquivo, dentro do model `Usuario`, adicionar a relação inversa: `coAdministracoes CampeonatoAdmin[]`.

- [ ] **Step 3:** Dentro do model `Campeonato`, adicionar a relação inversa: `coAdmins CampeonatoAdmin[]`.

- [ ] **Step 4:** No final do arquivo, adicionar o novo model:

```prisma
model CampeonatoAdmin {
  id            Int        @id @default(autoincrement())
  campeonatoId  Int
  campeonato    Campeonato @relation(fields: [campeonatoId], references: [id], onDelete: Cascade)
  usuarioId     Int
  usuario       Usuario    @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  permissoes    Json
  criadoEm      DateTime   @default(now())
  atualizadoEm  DateTime   @updatedAt

  @@unique([campeonatoId, usuarioId])
  @@index([usuarioId])
}
```

- [ ] **Step 5:** Rodar `cd backend && npx prisma migrate dev --name add_username_e_coadm` (com `.env` carregado com `DATABASE_URL` local).

- [ ] **Step 6:** Verificar que `backend/prisma/migrations/*_add_username_e_coadm/migration.sql` existe e contém `ALTER TABLE "Usuario" ADD COLUMN "username" TEXT`, `CREATE UNIQUE INDEX`, `CREATE TABLE "CampeonatoAdmin"`.

- [ ] **Step 7:** Commit.

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: username único e tabela CampeonatoAdmin"
```

---

### Task 2: Service de permissão (puro, testado)

**Files:**
- Modify: `backend/src/services/permissoes.js`
- Create: `backend/src/services/permissoes.test.js`

**Interfaces:**
- Consumes: `CampeonatoAdmin` row shape da Task 1.
- Produces:
  - `export const ESCOPOS_COADM = ['gerenciar', 'elenco', 'calendario', 'sumula', 'coAdms', 'excluir']` (array de strings, nessa ordem).
  - `export function permissoesTudoMarcado(): { gerenciar: boolean, elenco: boolean, calendario: boolean, sumula: boolean, coAdms: boolean, excluir: boolean }` — retorna objeto com todas as 6 chaves em `true`.
  - `export function normalizarPermissoes(input: unknown): Permissoes` — coage input arbitrário em objeto com as 6 chaves booleanas (default false para chaves ausentes, ignora chaves extras).
  - `export function temPermissaoCampeonato(camp: { usuarioId: number }, adminRow: { permissoes: unknown } | null, usuario: { id: number, isSuperAdmin: boolean }, escopo: string): boolean` — true se super admin, ou dono do campeonato, ou adminRow tem a flag correspondente true.
  - `export async function assertPermissaoCampeonato(usuarioId: number, campeonatoId: number, escopo: string): Promise<{ camp, usuario }>` — carrega Usuario, Campeonato e CampeonatoAdmin via prisma, chama `temPermissaoCampeonato`, joga `notFound('Campeonato não encontrado')` se não tem acesso (mesmo quando o campeonato existe — não vazar existência), joga `forbidden` se autenticado mas sem permissão. Retorna `{ camp, usuario }` em sucesso.

- [ ] **Step 1: Write the failing tests**

Em `backend/src/services/permissoes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { temPermissaoCampeonato, normalizarPermissoes, permissoesTudoMarcado, ESCOPOS_COADM } from './permissoes.js';

const DONO = { id: 1, isSuperAdmin: false };
const OUTRO = { id: 2, isSuperAdmin: false };
const SUPER = { id: 99, isSuperAdmin: true };
const CAMP = { usuarioId: 1 };

test('dono do campeonato tem todos os escopos', () => {
  for (const escopo of ESCOPOS_COADM) {
    assert.equal(temPermissaoCampeonato(CAMP, null, DONO, escopo), true);
  }
});

test('super admin tem todos os escopos mesmo sem adminRow', () => {
  for (const escopo of ESCOPOS_COADM) {
    assert.equal(temPermissaoCampeonato(CAMP, null, SUPER, escopo), true);
  }
});

test('usuário sem adminRow não tem permissão', () => {
  assert.equal(temPermissaoCampeonato(CAMP, null, OUTRO, 'gerenciar'), false);
});

test('co-adm só tem os escopos marcados como true', () => {
  const adminRow = { permissoes: { gerenciar: true, elenco: false, calendario: true, sumula: false, coAdms: false, excluir: false } };
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'gerenciar'), true);
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'calendario'), true);
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'elenco'), false);
  assert.equal(temPermissaoCampeonato(CAMP, adminRow, OUTRO, 'excluir'), false);
});

test('normalizarPermissoes zera chaves ausentes e ignora extras', () => {
  const p = normalizarPermissoes({ gerenciar: true, elenco: 'sim', extra: true });
  assert.deepEqual(p, { gerenciar: true, elenco: false, calendario: false, sumula: false, coAdms: false, excluir: false });
});

test('permissoesTudoMarcado liga tudo', () => {
  assert.deepEqual(permissoesTudoMarcado(), {
    gerenciar: true, elenco: true, calendario: true, sumula: true, coAdms: true, excluir: true,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --test src/services/permissoes.test.js`
Expected: FAIL com "export 'temPermissaoCampeonato' is not defined" (ou similar).

- [ ] **Step 3:** Em `backend/src/services/permissoes.js`, adicionar `ESCOPOS_COADM`, `permissoesTudoMarcado`, `normalizarPermissoes`, `temPermissaoCampeonato` e `assertPermissaoCampeonato`. `normalizarPermissoes` coage cada chave para `Boolean(input?.[k])`. `temPermissaoCampeonato` é a lógica descrita em Interfaces. `assertPermissaoCampeonato` carrega `prisma.usuario.findUnique` + `prisma.campeonato.findUnique` + `prisma.campeonatoAdmin.findUnique({ where: { campeonatoId_usuarioId }})`, chama a pura, lança `notFound('Campeonato não encontrado')` se `camp == null` ou se usuário não é super/dono/co-adm (mesma mensagem — não vazar existência), senão retorna `{ camp, usuario }`.

- [ ] **Step 4:** Rodar `cd backend && node --test src/services/permissoes.test.js`. Esperado: PASS em todos os 6 testes.

- [ ] **Step 5:** Commit.

```bash
git add backend/src/services/permissoes.js backend/src/services/permissoes.test.js
git commit -m "feat: service de permissão por escopo + testes"
```

---

### Task 3: Substituir `getOwned` em `campeonatos.js` pelo novo asserter

**Files:**
- Modify: `backend/src/routes/campeonatos.js:74-81` (função `getOwned`) + todos os call sites (linhas 115, 125+, 167, 220, 254, 263, 278, 311, 329, 339, 360, 369, 401, 423, 460, 536, 581, 604, 627).

**Interfaces:**
- Consumes: `assertPermissaoCampeonato` da Task 2.
- Produces: função nova `getCampComPermissao(usuarioId, id, escopo): Promise<Campeonato>` dentro do `campeonatos.js` que chama `assertPermissaoCampeonato` e devolve só `camp`.

- [ ] **Step 1:** Em `backend/src/routes/campeonatos.js`, importar `assertPermissaoCampeonato` do service.

- [ ] **Step 2:** Substituir a função `getOwned` por `async function getCampComPermissao(usuarioId, id, escopo)` que chama `assertPermissaoCampeonato(usuarioId, id, escopo)` e retorna `camp`. Remover a consulta duplicada de `isSuperAdmin` (já tratada pelo asserter).

- [ ] **Step 3:** Atualizar cada call site do antigo `getOwned` para passar o escopo apropriado:

Rotas de leitura usam `getCampLeitura` (qualquer membro do campeonato — ver Step 4). As demais declaram o escopo específico:

| Endpoint (linha aproximada) | Escopo |
|---|---|
| `GET /:id` (`:115`) | leitura |
| `PUT /:id` (`:167`) | `gerenciar` |
| `DELETE /:id` (`:220`) | `excluir` |
| `GET /:id/sumula-config` (`:254`) | leitura |
| `PUT /:id/sumula-config` (`:263`) | `sumula` |
| `GET /:id/times` (`:278`) | leitura |
| `POST /:id/inscricoes` (`:311`) | `elenco` |
| `DELETE /:id/inscricoes/:timeId` (`:329`) | `elenco` |
| `GET /:id/grupos` (`:339`) | leitura |
| `POST /:id/gerar-rodadas` (`:360`) | `calendario` |
| `GET /:id/partidas` (`:369`) | leitura |
| `POST /:id/partidas` (`:401`) | `calendario` |
| `POST /:id/rodadas/:n/clonar-volta` (`:423`) | `calendario` |
| `POST /:id/sortear-tudo` (`:460`) | `calendario` |
| `POST /:id/rodadas/:n/sortear-resto` (`:536`) | `calendario` |
| `GET /:id/arbitros` (`:581`) | leitura |
| `POST /:id/arbitros` (`:604`) | `calendario` |
| `DELETE /:id/arbitros/:arbitroId` (`:627`) | `calendario` |

- [ ] **Step 4:** Para endpoints de leitura, criar wrapper `getCampLeitura(usuarioId, id)` que aceita **qualquer** membro do campeonato: `camp.usuarioId === usuarioId || isSuperAdmin || existe CampeonatoAdmin{campeonatoId, usuarioId}`. Co-adm sem nenhuma flag true ainda consegue ler — inviável porque o convite sempre tem pelo menos uma flag marcada. Substitui todos os GETs da tabela acima.

- [ ] **Step 5:** Alterar `GET /campeonatos/` (linha `:94-111`): consulta passa a retornar união de `{ usuarioId: req.userId }` (dono) e `{ coAdmins: { some: { usuarioId: req.userId } } }` (co-adm). Super admin continua vendo tudo. Cada item do DTO ganha campo `papel: 'dono' | 'co-adm'` (derivado comparando `c.usuarioId === req.userId`). Stats continuam baseadas na união.

- [ ] **Step 6:** Atualizar `toCampDto` (linha `:50-72`) para aceitar `papel` como terceiro argumento e incluir no payload.

- [ ] **Step 7:** Rodar `cd backend && node --check src/routes/campeonatos.js` pra garantir sintaxe.

- [ ] **Step 8:** Rodar `cd backend && npm test` pra garantir que nada dos testes de serviço quebrou.

- [ ] **Step 9:** Commit.

```bash
git add backend/src/routes/campeonatos.js
git commit -m "feat: autorização por escopo nos endpoints de campeonato"
```

---

### Task 4: Endpoints de co-adms + busca de usuários

**Files:**
- Modify: `backend/src/routes/campeonatos.js` (adicionar endpoints `/:id/co-adms` ao final do arquivo)
- Create: `backend/src/routes/usuarios.js`
- Modify: `backend/src/index.js` (montar `usuariosRouter`)

**Interfaces:**
- Consumes: `assertPermissaoCampeonato`, `normalizarPermissoes`, `permissoesTudoMarcado` da Task 2.
- Produces:
  - `GET /api/campeonatos/:id/co-adms` → `[{ usuarioId, username, nome, email, permissoes, dono: boolean }]`.
  - `POST /api/campeonatos/:id/co-adms` body `{ identificador: string, permissoes: Permissoes }` → objeto do co-adm criado. 404 se identificador não existe, 400 se é o próprio dono, 409 se já é co-adm, 400 se tenta convidar a si mesmo (requer `coAdms`).
  - `PATCH /api/campeonatos/:id/co-adms/:usuarioId` body `{ permissoes }` (requer `coAdms`, bloqueia self-edit com 403).
  - `DELETE /api/campeonatos/:id/co-adms/:usuarioId` → 204 (requer `coAdms` ou ser o próprio alvo).
  - `GET /api/usuarios/buscar?q=xxx` → `[{ usuarioId, username, nome }]`, max 5, apenas username, requer `q.length >= 3`, rate limit 30 req/min por `req.userId`.

- [ ] **Step 1: Write failing route-level tests**

Como o projeto não tem infra de teste HTTP, os testes "de rota" aqui são **testes de regra pura** verificando o shape dos helpers. Adicionar em `backend/src/services/permissoes.test.js`:

```js
import { podeSerConvidado, podeEditarPermissoesDe } from './permissoes.js';

test('podeSerConvidado rejeita o próprio dono', () => {
  assert.deepEqual(
    podeSerConvidado({ usuarioId: 1 }, { id: 1 }, null),
    { ok: false, motivo: 'eh-o-dono' },
  );
});

test('podeSerConvidado rejeita quem já é co-adm', () => {
  assert.deepEqual(
    podeSerConvidado({ usuarioId: 1 }, { id: 2 }, { usuarioId: 2 }),
    { ok: false, motivo: 'ja-eh-co-adm' },
  );
});

test('podeSerConvidado aceita usuário novo', () => {
  assert.deepEqual(
    podeSerConvidado({ usuarioId: 1 }, { id: 2 }, null),
    { ok: true },
  );
});

test('podeEditarPermissoesDe bloqueia auto-edição', () => {
  assert.equal(podeEditarPermissoesDe({ id: 2 }, 2), false);
});

test('podeEditarPermissoesDe permite editar outros', () => {
  assert.equal(podeEditarPermissoesDe({ id: 2 }, 3), true);
});
```

- [ ] **Step 2:** Rodar `cd backend && node --test src/services/permissoes.test.js`. Esperado: FAIL nos 5 novos testes com "not exported".

- [ ] **Step 3:** Em `backend/src/services/permissoes.js`, adicionar:
  - `export function podeSerConvidado(camp, alvoUsuario, adminExistente): { ok: true } | { ok: false, motivo: 'eh-o-dono' | 'ja-eh-co-adm' }` — retorna `eh-o-dono` se `alvoUsuario.id === camp.usuarioId`, `ja-eh-co-adm` se `adminExistente != null`, senão `ok: true`.
  - `export function podeEditarPermissoesDe(reqUser, alvoUsuarioId): boolean` — `reqUser.id !== alvoUsuarioId`.

- [ ] **Step 4:** Rodar os testes. Esperado: PASS nos 5 novos.

- [ ] **Step 5:** Em `backend/src/routes/campeonatos.js`, adicionar ao final (antes do export):

Schemas Zod:
```js
const permissoesSchema = z.object({
  gerenciar: z.boolean(), elenco: z.boolean(), calendario: z.boolean(),
  sumula: z.boolean(), coAdms: z.boolean(), excluir: z.boolean(),
});
const convidarCoAdmSchema = z.object({
  identificador: z.string().trim().min(1).max(200),
  permissoes: permissoesSchema,
});
const editarCoAdmSchema = z.object({ permissoes: permissoesSchema });
```

Endpoints:
- `GET /:id/co-adms` — usa `getCampLeitura` (qualquer membro do campeonato pode ver quem são os colegas); retorna dono (como `{ usuarioId: camp.usuarioId, …, permissoes: permissoesTudoMarcado(), dono: true }`) + lista de `CampeonatoAdmin` com `include: { usuario: { select: { id, username, nome, email } } }`.
- `POST /:id/co-adms` — requer `coAdms`; `identificador` é email se contém `@`, senão username; busca `prisma.usuario.findUnique` por `{ email }` ou `{ username }`; 404 se não existe; chama `podeSerConvidado`; cria `CampeonatoAdmin` com `permissoes: normalizarPermissoes(data.permissoes)`; captura erro P2002 do Prisma e vira 409.
- `PATCH /:id/co-adms/:usuarioId` — requer `coAdms`; se `!podeEditarPermissoesDe(req.user, Number(req.params.usuarioId))` → 403; atualiza `permissoes`.
- `DELETE /:id/co-adms/:usuarioId` — permite se `req.userId === Number(req.params.usuarioId)` (auto-remoção) OU se `assertPermissaoCampeonato(..., 'coAdms')` passa. Em ambos os casos faz `prisma.campeonatoAdmin.deleteMany({ where: { campeonatoId, usuarioId: alvo } })`.

- [ ] **Step 6:** Criar `backend/src/routes/usuarios.js`:

```js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../lib/http.js';

export const usuariosRouter = Router();

const buscaLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `busca:${req.userId ?? req.ip}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

usuariosRouter.use(authRequired);

usuariosRouter.get(
  '/buscar',
  buscaLimiter,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    if (q.length < 3) return res.json([]);
    const lista = await prisma.usuario.findMany({
      where: { username: { startsWith: q, mode: 'insensitive' } },
      select: { id: true, username: true, nome: true },
      take: 5,
      orderBy: { username: 'asc' },
    });
    res.json(lista.map((u) => ({ usuarioId: u.id, username: u.username, nome: u.nome })));
  }),
);
```

- [ ] **Step 7:** Em `backend/src/index.js:70`, logo abaixo da linha `/api/jogadores`, adicionar:

```js
import { usuariosRouter } from './routes/usuarios.js';
// ...
app.use('/api/usuarios', apiLimiter, usuariosRouter);
```

- [ ] **Step 8:** Rodar `cd backend && npm test`. Esperado: todos os testes passam.

- [ ] **Step 9:** Smoke manual com `curl` (ou aguardar Task 6 pro frontend): subir o servidor, criar um usuário via `POST /auth/register`, autenticar, chamar `GET /api/usuarios/buscar?q=xxx`. Documentar o resultado em `scratchpad` se quiser; não bloquear a task com isso.

- [ ] **Step 10:** Commit.

```bash
git add backend/src/routes/campeonatos.js backend/src/routes/usuarios.js backend/src/index.js backend/src/services/permissoes.js backend/src/services/permissoes.test.js
git commit -m "feat: endpoints de co-adms e busca de usuários"
```

---

### Task 5: Register com username + `/auth/escolher-username` + `/auth/me`

**Files:**
- Modify: `backend/src/routes/auth.js`

**Interfaces:**
- Produces:
  - `POST /api/auth/register` body ganha `username: string` obrigatório, validado por regex `^[a-z0-9_]{3,20}$` e contra lista de reservados. 409 se já existe.
  - `POST /api/auth/escolher-username` autenticado, body `{ username }`. 409 se usuário já tem username; 409 se username ocupado; 400 se inválido. Retorna `{ usuario: { id, nome, email, username, isSuperAdmin } }`.
  - `GET /api/auth/me` autenticado → `{ usuario: { id, nome, email, username, isSuperAdmin } }`.
  - Resposta de `/login` e `/register` passa a incluir `username` no payload `usuario`.

- [ ] **Step 1:** Em `backend/src/routes/auth.js`, adicionar constantes:

```js
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const USERNAME_RESERVADOS = new Set(['admin', 'root', 'placar', 'api', 'null', 'undefined']);
function validarUsername(raw) {
  const u = String(raw ?? '').trim().toLowerCase();
  if (!USERNAME_REGEX.test(u)) throw badRequest('Username deve ter 3–20 chars, apenas a-z, 0-9, _');
  if (USERNAME_RESERVADOS.has(u)) throw badRequest('Username reservado');
  return u;
}
```

Importar `badRequest` e `authRequired` no topo do arquivo.

- [ ] **Step 2:** Modificar `registerSchema` para incluir `username: z.string().min(3).max(20)`. No handler do `/register`, após `parse`, chamar `validarUsername(username)`, checar duplicata em `prisma.usuario.findUnique({ where: { username }})` (409 se existe), passar para `prisma.usuario.create`. Incluir `username` na resposta.

- [ ] **Step 3:** Adicionar handler `/escolher-username`:

```js
authRouter.post('/escolher-username', authRequired, asyncHandler(async (req, res) => {
  const username = validarUsername(req.body?.username);
  const u = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!u) throw unauthorized('Sessão inválida');
  if (u.username) throw conflict('Usuário já tem username');
  const ocupado = await prisma.usuario.findUnique({ where: { username } });
  if (ocupado) throw conflict('Username já em uso');
  const atualizado = await prisma.usuario.update({ where: { id: req.userId }, data: { username } });
  res.json({ usuario: { id: atualizado.id, nome: atualizado.nome, email: atualizado.email, username: atualizado.username, isSuperAdmin: atualizado.isSuperAdmin } });
}));
```

- [ ] **Step 4:** Adicionar handler `/me`:

```js
authRouter.get('/me', authRequired, asyncHandler(async (req, res) => {
  const u = await prisma.usuario.findUnique({ where: { id: req.userId } });
  if (!u) throw unauthorized('Sessão inválida');
  res.json({ usuario: { id: u.id, nome: u.nome, email: u.email, username: u.username, isSuperAdmin: u.isSuperAdmin } });
}));
```

- [ ] **Step 5:** No handler `/login`, incluir `username: u.username` no payload da resposta.

- [ ] **Step 6:** Rodar `cd backend && node --check src/routes/auth.js`. Esperado: sem erro.

- [ ] **Step 7:** Rodar `cd backend && npm test`. Esperado: PASS.

- [ ] **Step 8:** Commit.

```bash
git add backend/src/routes/auth.js
git commit -m "feat: username no register, escolher-username, /auth/me"
```

---

### Task 6: `frontend/src/lib/api.ts` — tipos e métodos novos

**Files:**
- Modify: `frontend/src/lib/api.ts:80-81` (Usuario), `:83-108` (Campeonato / CampeonatosResponse), `:339-493` (`api` object).

**Interfaces:**
- Produces:
  - Tipo `Usuario` ganha `username: string | null`.
  - Novo tipo `export type EscopoCoAdm = 'gerenciar' | 'elenco' | 'calendario' | 'sumula' | 'coAdms' | 'excluir';`
  - `export interface Permissoes { gerenciar, elenco, calendario, sumula, coAdms, excluir: boolean; }`
  - `export interface CoAdm { usuarioId: number; username: string | null; nome: string; email: string; permissoes: Permissoes; dono: boolean; }`
  - `export interface UsuarioBusca { usuarioId: number; username: string; nome: string; }`
  - `Campeonato` ganha `papel: 'dono' | 'co-adm'`.
  - Novos métodos em `api`: `me()`, `escolherUsername(username)`, `buscarUsuarios(q)`, `listarCoAdms(id)`, `convidarCoAdm(id, data)`, `editarCoAdm(id, usuarioId, permissoes)`, `removerCoAdm(id, usuarioId)`.

- [ ] **Step 1:** Em `api.ts`, atualizar interface `Usuario` para incluir `username: string | null`.

- [ ] **Step 2:** Adicionar os tipos `EscopoCoAdm`, `Permissoes`, `CoAdm`, `UsuarioBusca` junto dos outros tipos (perto de `Usuario`).

- [ ] **Step 3:** Em `Campeonato`, adicionar `papel: 'dono' | 'co-adm'` ao fim da interface.

- [ ] **Step 4:** Em `register` e `login`, atualizar a resposta pra incluir `username`. Como o backend já retorna, e `Usuario` foi ampliado, o tipo já cobre; nenhum ajuste de body necessário.

- [ ] **Step 5:** No `api` object (linha `:339`), adicionar:

```ts
me: () => request<{ usuario: Usuario }>('/auth/me'),
escolherUsername: (username: string) =>
  request<{ usuario: Usuario }>('/auth/escolher-username', { method: 'POST', body: body({ username }) }),
buscarUsuarios: (q: string) =>
  request<UsuarioBusca[]>(`/usuarios/buscar?q=${encodeURIComponent(q)}`),
listarCoAdms: (campeonatoId: number) =>
  request<CoAdm[]>(`/campeonatos/${campeonatoId}/co-adms`),
convidarCoAdm: (campeonatoId: number, data: { identificador: string; permissoes: Permissoes }) =>
  request<CoAdm>(`/campeonatos/${campeonatoId}/co-adms`, { method: 'POST', body: body(data) }),
editarCoAdm: (campeonatoId: number, usuarioId: number, permissoes: Permissoes) =>
  request<CoAdm>(`/campeonatos/${campeonatoId}/co-adms/${usuarioId}`, { method: 'PATCH', body: body({ permissoes }) }),
removerCoAdm: (campeonatoId: number, usuarioId: number) =>
  request<void>(`/campeonatos/${campeonatoId}/co-adms/${usuarioId}`, { method: 'DELETE' }),
```

- [ ] **Step 6:** Atualizar o atalho `auth.save` se necessário pra preservar `username` (já salva o objeto inteiro via `JSON.stringify(r.usuario)`, então nenhum ajuste).

- [ ] **Step 7:** Rodar `cd frontend && npx tsc -b`. Esperado: sem erro.

- [ ] **Step 8:** Commit.

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(api): tipos e métodos de co-adm e username"
```

---

### Task 7: Register.tsx — campo username

**Files:**
- Modify: `frontend/src/components/screens/Register.tsx`

**Interfaces:**
- Consumes: `api.register` já aceita `username` via Task 5 e tipo via Task 6.
- Produces: tela de registro envia `username` no payload.

- [ ] **Step 1:** Abrir o arquivo. Adicionar `username` no estado do form (string, default `""`).

- [ ] **Step 2:** Adicionar o input `<Input>` com label "Username" entre nome e email, placeholder `"ex.: joao_silva"`, `maxLength={20}`, `autoComplete="username"`, `onChange` que normaliza pra lowercase.

- [ ] **Step 3:** Incluir `username` no payload do `api.register`. Tratar erro 409 "Username já em uso" / 409 "Email já cadastrado" com mensagens inline distintas (já existe lógica de erro — só garantir que a message do backend aparece).

- [ ] **Step 4:** Validar no cliente antes do submit: regex `^[a-z0-9_]{3,20}$`; se falhar, mostrar inline sem bater no backend.

- [ ] **Step 5:** Rodar `cd frontend && npx tsc -b`. Esperado: sem erro.

- [ ] **Step 6:** Commit.

```bash
git add frontend/src/components/screens/Register.tsx
git commit -m "feat(register): campo username obrigatório"
```

---

### Task 8: Tela EscolherUsername + gate em ProtectedRoute/useAuth

**Files:**
- Create: `frontend/src/components/screens/EscolherUsername.tsx`
- Modify: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/lib/useAuth.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `api.me`, `api.escolherUsername` da Task 6.
- Produces: qualquer rota protegida com usuário logado sem username redireciona pra `/escolher-username`, que só sai após submit válido.

- [ ] **Step 1:** Em `useAuth.tsx`: depois de login/register bem-sucedido, chamar `api.me()` e salvar o payload (garante `username` atualizado mesmo pra sessões antigas que não têm username no localStorage).

- [ ] **Step 2:** Em `ProtectedRoute.tsx`: se `auth.getUser()?.username == null` e a rota atual não é `/escolher-username`, redirecionar via `<Navigate to="/escolher-username" replace />`.

- [ ] **Step 3:** Criar `EscolherUsername.tsx`: form simples com um input (mesma regex client-side da Task 7), botão "Salvar". Ao submeter, chama `api.escolherUsername`, salva o novo `usuario` em `auth.save` reutilizando o token existente (`auth.save({ token: auth.getToken()!, usuario })`), e navega pra `/`. Erros 409 "Username já em uso" aparecem inline.

- [ ] **Step 4:** Em `App.tsx`, adicionar `<Route path="/escolher-username" element={<ProtectedRoute><EscolherUsername /></ProtectedRoute>} />`. A rota é protegida mas o gate não redireciona pra ela mesma — cuidado no Step 2.

- [ ] **Step 5:** Rodar `cd frontend && npx tsc -b`. Esperado: sem erro.

- [ ] **Step 6:** Smoke manual: `cd frontend && npm run dev`, logar com conta existente (que agora tem `username == null` no DB após a migração), verificar redirect; escolher um username, verificar liberação.

- [ ] **Step 7:** Commit.

```bash
git add frontend/src/components/screens/EscolherUsername.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/lib/useAuth.tsx frontend/src/App.tsx
git commit -m "feat: tela e gate de escolher-username"
```

---

### Task 9: Tela de Co-adms + modal de convite + modal de editar

**Files:**
- Create: `frontend/src/components/screens/CoAdmins.tsx`
- Modify: `frontend/src/components/OrganizerLayout.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `api.listarCoAdms`, `api.convidarCoAdm`, `api.editarCoAdm`, `api.removerCoAdm`, `api.buscarUsuarios`.
- Produces: tela e modais funcionais.

- [ ] **Step 1:** Criar `CoAdmins.tsx`: usa `useParams` pra pegar `:id`; `useEffect` carrega `api.listarCoAdms`. Renderiza uma lista com dono no topo (badge "Dono") e os co-adms abaixo, cada um com username, nome, email e os 6 chips de permissão ligados/desligados. Botões "Editar" e "Remover" por linha (exceto no dono). Botão "Convidar co-adm" no topo direito.

- [ ] **Step 2:** Modal de convite: input de identificador com `useDebounce` de 400ms chamando `api.buscarUsuarios` quando `length >= 3` e não contém `@` — mostra dropdown com até 5 sugestões (username + nome); clicar numa sugestão preenche o input com o username. Abaixo, 6 checkboxes agrupados em seções visuais (ex.: "Administração" = gerenciar + excluir; "Dados" = elenco + calendario + sumula; "Equipe" = coAdms). Todos marcados por padrão via `permissoesTudoMarcado()` (duplicar o helper no frontend). Botão "Convidar" chama `api.convidarCoAdm`. Erros inline.

- [ ] **Step 3:** Modal de editar: idem ao de convite mas sem o input de identificador e sem o autocomplete; carrega as permissões atuais; botão "Salvar". Erros 403 (auto-edição) aparecem com copy claro — não deveria acontecer porque o botão não aparece no próprio registro, mas tratar defensivo.

- [ ] **Step 4:** Botão "Remover": `AlertDialog` do shadcn (padrão já usado no projeto), ao confirmar chama `api.removerCoAdm`.

- [ ] **Step 5:** Em `OrganizerLayout.tsx`, adicionar item "Co-adms" no menu lateral apontando para `/campeonatos/:id/co-admins`. Ícone sugerido: `UsersRound` do lucide (se o projeto já usa lucide — senão, escolher consistente).

- [ ] **Step 6:** Em `App.tsx`, adicionar rota `/campeonatos/:id/co-admins` dentro do `OrganizerLayout`.

- [ ] **Step 7:** Rodar `cd frontend && npx tsc -b`. Esperado: sem erro.

- [ ] **Step 8:** Smoke manual: logar como dono, criar um segundo usuário (via /register) em janela anônima, voltar pro dono, convidar o segundo usuário, verificar que ele aparece na lista; alternar permissões; remover.

- [ ] **Step 9:** Commit.

```bash
git add frontend/src/components/screens/CoAdmins.tsx frontend/src/components/OrganizerLayout.tsx frontend/src/App.tsx
git commit -m "feat: tela de co-adms com convite e edição de permissões"
```

---

### Task 10: Dashboard — duas seções (dono vs co-adm)

**Files:**
- Modify: `frontend/src/components/screens/Dashboard.tsx`

**Interfaces:**
- Consumes: `CampeonatosResponse` com campo `papel` por item (Task 6).

- [ ] **Step 1:** No `Dashboard.tsx`, depois de carregar `api.listarCampeonatos`, separar o array em duas partes por `c.papel === 'dono'` vs `'co-adm'`.

- [ ] **Step 2:** Renderizar duas seções com headings "Meus campeonatos" e "Campeonatos que administro". Se a segunda estiver vazia, a seção não aparece. Se a primeira estiver vazia, mostrar o CTA de criar que já existe hoje.

- [ ] **Step 3:** Cards de co-adm podem ganhar uma `Badge` discreta "Co-adm" (padrão `variant="secondary"` do shadcn). Opcional — implementador decide se agrega clareza ou vira ruído.

- [ ] **Step 4:** Rodar `cd frontend && npx tsc -b`. Esperado: sem erro.

- [ ] **Step 5:** Smoke manual: logar como co-adm, verificar que o campeonato aparece na seção "Campeonatos que administro".

- [ ] **Step 6:** Commit.

```bash
git add frontend/src/components/screens/Dashboard.tsx
git commit -m "feat(dashboard): seção de campeonatos co-administrados"
```

---

## Fora de escopo deste plano

Projetos 2 (duração de jogo configurável) e 3 (modo ao vivo) serão brainstormados e planejados separadamente.
