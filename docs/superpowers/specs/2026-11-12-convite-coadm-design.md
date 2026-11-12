# Design — Username único + Co-admin de campeonato

Projeto 1 de 3 do pedido do dia 2026-11-12 (os outros, em ordem: duração de jogo configurável, modo ao vivo). Esses projetos são independentes e serão desenhados e implementados um de cada vez; este documento cobre apenas o primeiro.

## Intent e o porquê

Hoje, só o criador de um campeonato (`Campeonato.usuarioId`) consegue administrá-lo. O organizador quer dividir o trabalho com outras pessoas de confiança, mas sem transferir a posse e sem abrir mão de controlar o que cada uma pode fazer. Cada convite é personalizado: o dono escolhe quais áreas do campeonato o co-adm pode mexer.

Como identificar quem convidar também precisa ficar melhor: email funciona, mas é longo e privado; username público é mais prático. Hoje usuários não têm username. Esta feature introduz esse identificador público, único no sistema, e o usa como entrada alternativa ao email no fluxo de convite.

## Goals

- Todo usuário passa a ter um `username` único (além do `email` único que já existe).
- Usuários novos escolhem username no registro.
- Usuários já existentes no sistema (hoje são 3 contas) são obrigados a escolher um username no próximo login, numa tela bloqueadora, antes de usar o resto do app.
- O dono de um campeonato pode convidar como co-adm qualquer usuário que já tenha conta no placar.io, buscando por email ou por username.
- No ato do convite, o dono vê 6 escopos de permissão — todos marcados por padrão — e desmarca os que não quer liberar.
- O dono pode, depois, editar as permissões de um co-adm ou removê-lo, numa aba do campeonato.
- O dono original sempre tem os 6 escopos liberados, implicitamente.
- Um co-adm com o escopo "co-adms" marcado pode, por sua vez, convidar, editar e remover outros co-adms do mesmo campeonato — com qualquer combinação de escopos, inclusive os que ele mesmo não tem. Mas nunca pode editar o próprio registro de permissões; só auto-remoção é permitida. Isso preserva a soberania da decisão do convite (o dono ou co-adm que convidou é quem manda nos escopos daquele co-adm).
- O escopo `excluir` é um toggle real: um co-adm com `excluir: true` consegue de fato apagar o campeonato. O dono do campeonato é responsável por só marcar essa caixa pra quem ele confia com uma ação irreversível.
- No dashboard, o usuário vê também os campeonatos onde é co-adm, não só os que criou.

## Non-goals

- Convite para quem ainda não tem conta (sem convite pendente, sem link compartilhável, sem envio de email transacional). Se o alvo não tem conta, ele cria uma primeiro e só então pode ser convidado.
- Papéis predefinidos tipo "editor", "visualizador", "placeholder". Só os 6 escopos como flags.
- Transferência de ownership. O criador original sempre é o dono; co-adm nunca vira dono.
- Histórico/auditoria de quem fez o quê no campeonato.
- Trocar o email como identificador primário de login (continua sendo email + senha).

## Anti-goals

- Quebrar o fluxo dos usuários existentes: não podem ficar impedidos de logar; o pior cenário é "logaram, caíram numa tela de escolher username, escolheram, continuaram". Nada de deletar conta ou pedir recadastro.
- Introduzir dependência de provedor de email transacional (Resend, SES, etc.). Este projeto roda sem infra nova.
- Estourar o número de endpoints da súmula/campeonato com um por ação permissão. Permissão é um check reusado, não uma proliferação de rotas.

## Constraints

- Monorepo `placar.io`: backend Node 20 ESM com Prisma/Postgres, frontend React 18 + TypeScript + shadcn/ui.
- Migrations via `npx prisma migrate dev --name <descritivo>` (nunca `db push`).
- Em produção, `prisma migrate deploy` roda no boot, e `JWT_SECRET` + `CORS_ORIGIN` são validados estritamente.
- Hoje a função de permissão central é `assertDonoDoCampeonato` em `backend/src/services/permissoes.js`, usada em rotas sensíveis (arbitragem, auxiliares). `assertPodeEditarSumula` já cobre o fluxo colaborativo da súmula (dono + juiz + auxiliares) e **continua existindo sem alteração** — co-adm é uma camada ortogonal a essa.
- Contrato HTTP consumido em `frontend/src/lib/api.ts`. Qualquer rota nova precisa estar lá.
- Rate limit já está em `/api/auth` (10 req/15min) — endpoints de verificar username ficam atrás desse mesmo limiter pra evitar enumeration.

## Decisões de design

### Escopos de permissão

Seis escopos. Nomes internos (chaves do JSON) entre parênteses:

1. **Gerenciar campeonato** (`gerenciar`) — editar dados básicos, status, formato, configurações. Não inclui excluir.
2. **Elenco** (`elenco`) — criar/editar/remover times e jogadores, busca e inscrição em lote.
3. **Calendário** (`calendario`) — criar partida manual, sortear rodadas, clonar volta, editar data/local/transmissão, definir juiz/auxiliares das partidas.
4. **Súmula** (`sumula`) — registrar gols, cartões, escalação, placar final, fechar partida. É ortogonal ao sistema `Partida.juizId`/`PartidaAuxiliar` existente: um co-adm com `sumula: true` pode editar qualquer súmula do campeonato; o sistema antigo continua valendo para quem não é co-adm.
5. **Co-adms** (`coAdms`) — convidar, editar e remover co-adms do campeonato.
6. **Excluir campeonato** (`excluir`) — toggle isolado porque é irreversível.

O dono original tem todos os 6 implicitamente, sem linha em `CampeonatoAdmin`.

### Modelo de dados

Nova tabela:

```prisma
model CampeonatoAdmin {
  id            String      @id @default(cuid())
  campeonatoId  String
  usuarioId     String
  permissoes    Json        // { gerenciar, elenco, calendario, sumula, coAdms, excluir: bool }
  criadoEm      DateTime    @default(now())
  atualizadoEm  DateTime    @updatedAt

  campeonato    Campeonato  @relation(fields: [campeonatoId], references: [id], onDelete: Cascade)
  usuario       Usuario     @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@unique([campeonatoId, usuarioId])
  @@index([usuarioId])
}
```

JSON para `permissoes` porque: (a) são seis flags fixas, pouco provável virar algo polimórfico; (b) alterações futuras de nome/ordem de escopo não exigem migração; (c) Prisma lida com `Json` em Postgres nativamente. Default do campo no backend (não no schema): todos `true`.

Em `Usuario`:

```prisma
username  String?  @unique   // nullable para a migração; backend trata null como "escolher antes de usar"
```

Nullable na migration para não exigir backfill forçado no SQL — o próprio fluxo de login resolve.

### Permissão check no backend

Substituir `assertDonoDoCampeonato` em locais de administração por uma versão parametrizada:

```js
// services/permissoes.js
export async function assertPermissaoCampeonato(prisma, campeonatoId, usuarioId, escopo) {
  const camp = await prisma.campeonato.findUnique({ where: { id: campeonatoId } });
  if (!camp) throw badRequest('Campeonato não encontrado');
  if (camp.usuarioId === usuarioId) return camp;  // dono original
  const admin = await prisma.campeonatoAdmin.findUnique({
    where: { campeonatoId_usuarioId: { campeonatoId, usuarioId } }
  });
  if (admin?.permissoes?.[escopo]) return camp;
  throw unauthorized('Sem permissão para essa ação neste campeonato');
}
```

Cada endpoint declara o escopo que exige. Mapeamento inicial (não exaustivo — o implementador cobre todos os endpoints, usando este mapa como guia):

- `PATCH /campeonatos/:id` → `gerenciar`
- `DELETE /campeonatos/:id` → `excluir`
- `POST/PATCH/DELETE` em times/jogadores → `elenco`
- `POST /campeonatos/:id/partidas`, `PATCH /partidas/:id`, `DELETE /partidas/:id`, `POST /campeonatos/:id/rodadas/:n/clonar-volta`, `POST /campeonatos/:id/rodadas/:n/sortear-resto`, `POST /campeonatos/:id/sortear-tudo`, `POST /campeonatos/:id/arbitragem`, `POST /campeonatos/:id/auxiliares` → `calendario`
- Tudo do `sumulaRouter` (gols, cartões, escalação, placar, dados) → `sumula`
- Endpoints novos de co-adms (abaixo) → `coAdms`

`assertPodeEditarSumula` fica como está: ele resolve o caso de juiz/auxiliar de uma partida específica. Co-adm com `sumula: true` passa num cheque paralelo feito antes dele. O endpoint pode tentar `assertPermissaoCampeonato(..., 'sumula')` e, se falhar, cair em `assertPodeEditarSumula`.

### Endpoints novos

Todos sob `campeonatosRouter`:

- `GET /campeonatos/:id/co-adms` — lista os co-adms com `{ usuarioId, username, email, nome, permissoes }`. Autorização: dono ou co-adm com qualquer escopo (ou seja, autenticado + membro). Dono original aparece no topo com flag `dono: true` e todas as permissões como `true`.
- `POST /campeonatos/:id/co-adms` — body `{ identificador: string, permissoes: { gerenciar, elenco, calendario, sumula, coAdms, excluir } }`. `identificador` é tratado como email se contém `@`, senão como username. Resolve pro usuário; erro 404 se não existir; erro 409 se já é co-adm; erro 400 se o usuário é o próprio dono. Autorização: `coAdms`.
- `PATCH /campeonatos/:id/co-adms/:usuarioId` — body `{ permissoes }`. Autorização: `coAdms`. **Bloqueia auto-edição**: se `req.user.id === :usuarioId`, responde 403 (nem o co-adm com `coAdms: true` pode mexer no próprio registro).
- `DELETE /campeonatos/:id/co-adms/:usuarioId` — autorização: `coAdms` **ou** o próprio co-adm removendo a si mesmo (nesse caso dispensa qualquer escopo).

Nos endpoints acima o dono original nunca aparece em `CampeonatoAdmin` e não pode ser editado/removido por lá.

### Endpoints de usuário

- `POST /auth/register` ganha campo `username` (string, validada — ver abaixo).
- `POST /auth/escolher-username` — autenticado, body `{ username }`. Só funciona se o usuário atual ainda tiver `username = null`. Após salvar, retorna novo payload do usuário (sem reemitir JWT; o token atual já é do mesmo userId).
- `GET /usuarios/buscar?q=<texto>` — autenticado, limitado em 30 req/min por usuário autenticado (limiter próprio, não o de `/api/auth`). Retorna até 5 usuários cujo `username` começa com `q` — **nunca busca por email**. Payload por item: `{ usuarioId, username, nome }`, sem email, pra não permitir enumeration de PII via autocomplete. Sempre retorna lista (pode ser vazia). Não retorna nada se `q.length < 3`. Pra convidar por email, o organizador digita o email inteiro no modal e o `POST /campeonatos/:id/co-adms` faz a resolução.

### Validação de username

Regex: `^[a-z0-9_]{3,20}$`. Lowercase forçado na escrita (`username.toLowerCase()`). Comparação case-insensitive por via do lowercase no storage. Reservar nomes: `admin`, `root`, `placar`, `api`, `null`, `undefined` — lista pequena no código.

### Frontend

- **Register** (`screens/Register`): campo `username` entre nome e email, com debounce de 400ms chamando `GET /usuarios/buscar?q=...` pra indicar disponibilidade (verde/vermelho) antes do submit.
- **Nova tela `EscolherUsername`** (`screens/EscolherUsername`): rota protegida que intercepta qualquer navegação se `user.username == null`. Campo + submit. Após sucesso, retoma a rota original.
- **`AuthProvider`** (`lib/auth.tsx`): depois do login/register, se `user.username == null`, redireciona pra `/escolher-username`. `ProtectedRoute` ganha o mesmo gate.
- **Aba "Co-adms"** no `OrganizerLayout` do campeonato (adicionar item no menu lateral junto com os já existentes: Dashboard do campeonato, Times, Rodadas, etc.). A tela lista os co-adms, mostra o dono no topo, tem botão "Convidar" (modal) e, por linha, botão "Editar permissões" (modal) e "Remover".
- **Modal de convite**: input `identificador` (placeholder "email ou username"), autocomplete via `/usuarios/buscar` **só pra usernames** (email precisa ser digitado por inteiro, sem sugestão), 6 checkboxes agrupados por seção, todos marcados por padrão, botão "Convidar". Erros do backend (409 já existe, 404 não encontrado, 400 é o dono) aparecem inline.
- **Dashboard**: `Dashboard` passa a consultar dois endpoints ou um só que retorne união — ver em "Decisões do implementador". UI mostra duas seções: "Meus campeonatos" (criados por mim) e "Campeonatos que administro" (sou co-adm). Se uma das listas estiver vazia, a seção some.

### Migração do banco

Uma migration Prisma:

1. `ALTER TABLE "Usuario" ADD COLUMN "username" TEXT UNIQUE;` — nullable.
2. `CREATE TABLE "CampeonatoAdmin" (...)`.

Nenhum backfill de username. Os 3 usuários existentes são tratados pelo fluxo de login (escolher no próximo acesso).

## Decisões deixadas para o implementador (chamadas aqui porque o builder-check cobrou)

- Path exato da aba Co-adms na navegação (`/campeonatos/:id/co-adms` provavelmente, seguindo padrão dos outros itens).
- Se `Dashboard` usa um endpoint novo unificado (`GET /campeonatos/meus`) ou dois endpoints (um de criados, outro de onde sou co-adm). Preferência: um só com `source: 'dono' | 'co-adm'` em cada item.
- Se o payload do JWT precisa ganhar `username` ou se o frontend só lê de `GET /auth/me`. Preferência: só de `/auth/me` pra evitar reemissão de tokens.
- Implementação exata do autocomplete no modal de convite (debounce, shadcn `Command` vs. `Combobox` custom) — fica a critério, desde que funcione no mobile.
- Lista exata de nomes reservados de username — decisão de produto menor, implementador pode ajustar.

## Fora de escopo deste documento

- Projetos 2 (duração de jogo configurável) e 3 (modo ao vivo). Ambos serão brainstormados e documentados depois, independentes deste.
