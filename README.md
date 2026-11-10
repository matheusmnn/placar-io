# placar.io

Gerenciador de campeonatos amadores de futebol. O organizador cria o
campeonato, cadastra os times e jogadores, gera a tabela ou o chaveamento
automaticamente e preenche uma súmula no estilo CBF com gols, cartões,
substituições, estatísticas e observações. Qualquer pessoa consulta
classificação, chaveamento e artilharia pela página pública, sem login.

## Funcionalidades

- **5 formatos de campeonato**: pontos corridos, mata-mata,
  fase de grupos, grupos + mata-mata, pontos corridos + playoff.
- **Mata-mata**: jogo único ou ida+volta, com empate resolvido por
  pênaltis diretos ou por prorrogação + pênaltis, configurável por
  campeonato.
- **Critérios de desempate** configuráveis na ordem desejada
  (saldo, gols pró, gols contra, vitórias, sorteio).
- **Playoff dinâmico** via templates (Top 4 com final, Acesso Série B,
  EFL Championship) — a config pode ser estendida para qualquer
  chaveamento de posições finais.
- **Papéis na súmula**: além do dono do campeonato, o organizador
  atribui por email um juiz principal e múltiplos auxiliares que
  editam a súmula daquela partida.
- **Súmula CBF-style com 10 seções**: cabeçalho, arbitragem,
  cronologia (entradas / início / término / acréscimos por tempo),
  relação de jogadores com escalação titular/reserva, comissão técnica,
  gols (com tipo NR/PN/CT/FT e tempo mm:ss), cartões (com motivo
  oficial), substituições, estatísticas e observações livres. Tudo
  opcional exceto o placar final.
- **Tema escuro** por padrão com toggle, baseado em tokens do shadcn.

## Stack

### Backend (`backend/`)

- Node.js 20
- Express 4
- Prisma ORM
- PostgreSQL 15
- JWT via `jsonwebtoken`, senhas com `bcryptjs`
- Validação com `zod`, logs com `pino`
- Testes com `node:test` (built-in)

### Frontend (`frontend/`)

- React 18 com TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui (componentes sobre Radix UI)
- React Router v7

## Como rodar

### Pré-requisitos

- Node.js 20+
- PostgreSQL 15+ acessível
- Um usuário Postgres com permissão para criar o banco (ou use `db push`)

### Backend

```bash
cd backend
cp .env.example .env     # ajuste DATABASE_URL e JWT_SECRET
npm install
npx prisma db push       # aplica o schema sem exigir migrations
npm start                # escuta em :8080
npm test                 # roda os testes unitários
```

Variáveis em `.env`:

- `DATABASE_URL`: string de conexão Postgres
- `JWT_SECRET`: segredo HMAC para assinar tokens
- `JWT_EXPIRES_IN`: duração do token (default `7d`)
- `PORT`: porta HTTP (default `8080`)
- `CORS_ORIGIN`: origem(s) permitidas separadas por vírgula

### Frontend

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:8080/api
npm install
npm run dev              # servidor Vite em :5173
```

## Estrutura

```
backend/
  prisma/schema.prisma           modelo de dados
  src/
    index.js                     bootstrap Express
    lib/                         jwt, hash, prisma, http helpers
    middleware/                  auth, errors
    routes/                      auth, campeonatos, times, jogadores,
                                 partidas, publico, sumula, comissao
    services/
      chaveamento.js             round-robin circle method + KO bracket
      classificacao.js           tabela com critérios configuráveis
      confronto.js               resolução KO (agregado, prorrogação, pênaltis)
      grupos.js                  pareamento cross-group
      playoff.js                 construção do bracket do playoff
      partida.js                 geração de rodadas, avanço de fase
      permissoes.js              dono / juiz / auxiliar
      *.test.js                  testes unitários dos helpers puros

frontend/
  src/
    App.tsx                      rotas + providers (auth, tema)
    lib/
      api.ts                     cliente HTTP tipado da API
      theme.tsx                  ThemeProvider (dark por padrão)
      useAuth.tsx                contexto de autenticação
    components/
      OrganizerLayout.tsx        sidebar + header com toggle
      ThemeToggle.tsx
      screens/
        Login.tsx, Register.tsx
        PublicHome.tsx           busca pública de campeonatos
        PublicChampionship.tsx   classificação (geral e por grupo),
                                 chaveamento, rodadas, artilharia
        Dashboard.tsx            painel do organizador
        CreateChampionship.tsx   criação com todos os formatos
        RegisterTeams.tsx        times + atribuição de grupo
        RegisterPlayers.tsx      jogadores + dados oficiais +
                                 comissão técnica
        RoundsMatches.tsx        rodadas e partidas
        RegisterResult.tsx       súmula CBF-style com 10 seções
```

## API

As rotas espelham o shape que o frontend consome em `lib/api.ts`:

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/campeonatos`, `GET/PUT/DELETE /api/campeonatos/:id`
- `GET /api/campeonatos/:id/grupos`, `GET/POST /api/campeonatos/:id/times`
- `PUT/DELETE /api/times/:id`, `GET/POST /api/times/:id/jogadores`, `/comissao`
- `PUT/DELETE /api/jogadores/:id`, `PUT/DELETE /api/comissao/:id`
- `POST /api/campeonatos/:id/gerar-rodadas`, `GET /api/campeonatos/:id/partidas`
- `GET /api/partidas/:id` (retorna partida + arbitragem + cronologia +
  observações + gols + cartões + escalação + substituições + stats)
- `PUT /api/partidas/:id/resultado` (lote; mantém compat com telas antigas)
- `PUT /api/partidas/:id/placar` (fecha súmula sem apagar eventos
  granulares)
- `POST/PUT/DELETE /api/partidas/:id/gols`, `/api/gols/:id`
- `POST/PUT/DELETE /api/partidas/:id/cartoes`, `/api/cartoes/:id`
- `POST/DELETE /api/partidas/:id/substituicoes`, `/api/substituicoes/:id`
- `PUT /api/partidas/:id/escalacao` (bulk)
- `PUT /api/partidas/:id/cronologia`, `/observacoes`, `/arbitragem`, `/stats`
- `POST/DELETE /api/partidas/:id/auxiliares(/:userId)`
- `GET /api/public/campeonatos`, `GET /api/public/campeonatos/:id`
- `GET /api/public/campeonatos/:id/classificacao|classificacao-grupos|artilharia|rodadas`

## Licença

Projeto pessoal, sem licença definida. Para usar em outros contextos,
abra uma issue.
