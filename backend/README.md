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

## O que está em escopo até aqui (Fatia 6a)

- Formatos: `PONTOS_CORRIDOS`, `MATA_MATA`, `GRUPOS`, `GRUPOS_MATA_MATA`, **`PONTOS_CORRIDOS_MATA_MATA`**.
- **Mata-mata**: `idaVolta` + `koDesempate` (`PENALTIS` | `PRORROGACAO_PENALTIS`). Em ida+volta cada par vira 2 partidas (`legOrdem`), decisão por agregado → prorrogação (se habilitada) → pênaltis.
- **Grupos**: backend cria N grupos automaticamente; times atribuídos via `grupoId`.
- **Grupos + mata-mata**: `avancamPorGrupo` times de cada grupo avançam; emparelhamento cross simples (Ga[i]×Gb[N-1-i]).
- **Pontos corridos + mata-mata**: pontos corridos completo, depois playoff configurável (ver abaixo). Shortcut: critério de desempate `confrontoDireto` não implementado — usar sorteio.
- **Critérios de desempate configuráveis**: `Campeonato.criteriosDesempate` é um array na ordem desejada. Valores suportados: `saldo`, `golsPro`, `golsContra`, `vitorias`, `sorteio` (determinístico por timeId). Default: `["saldo","golsPro"]`.
- **Playoff dinâmico**: `Campeonato.playoff` JSON controla o chaveamento final:
  ```json
  {
    "posicoes": [3, 4, 5, 6],
    "chaveamento": [[3, 6], [4, 5]],
    "temFinal": true,
    "idaVolta": false,
    "desempate": "PENALTIS"
  }
  ```
  `temFinal: false` encerra após a primeira fase (ex: acesso Série B). `temFinal: true` + 2 confrontos → final (ex: EFL Championship). Default pra PCMM: top 4 com 1×4, 2×3, final.
- **Súmula CBF-style**: modelo completo + endpoints granulares — gols, cartões, substituições têm CRUD individual; escalação é bulk; cronologia, observações, arbitragem são PUT por grupo. Tudo opcional menos o placar final. `PUT /partidas/:id/resultado` antigo continua funcionando (compat).
- **Papéis na súmula**: dono do campeonato pode tudo; juiz principal (`Partida.juizId`) e auxiliares (`PartidaAuxiliar`) podem editar a súmula daquela partida. Juiz e auxiliares são usuários registrados; organizador atribui via email em `PUT /partidas/:id/arbitragem` e `POST /partidas/:id/auxiliares`.
- **Novos campos de jogador**: `apelido`, `nomeCompleto`, `registro` (livre — serve de "ID CBF" ou qualquer registro), `profissional` (bool, default true).
- **Comissão técnica**: ligada ao Time; CRUD em `/times/:id/comissao` + `/comissao/:id`. Funções enum: TECNICO, ASSISTENTE_TECNICO, MEDICO, TREINADOR_GOLEIROS, PREPARADOR_FISICO, FISIOTERAPEUTA, MASSAGISTA.
- **Gols**: ganham `tipo` (NORMAL, PENALTI, CONTRA, FALTA) e `tempoSegundos` (precisão mm:ss, mantém `minuto` por compat).
- **Cartões**: ganham `tempoSegundos`, `motivoCodigo` (ex.: "A1.3") e `motivoDescricao`.

### Endpoints novos (Fatia 5)

- `POST/PUT/DELETE /api/partidas/:id/gols`, `/api/gols/:id`
- `POST/PUT/DELETE /api/partidas/:id/cartoes`, `/api/cartoes/:id`
- `POST/DELETE /api/partidas/:id/substituicoes`, `/api/substituicoes/:id`
- `PUT /api/partidas/:id/escalacao` (bulk: `{ titulares: [id], reservas: [id] }`)
- `PUT /api/partidas/:id/cronologia`, `/observacoes`, `/arbitragem`
- `POST/DELETE /api/partidas/:id/auxiliares(/:userId)`
- `GET/POST /api/times/:id/comissao`, `PUT/DELETE /api/comissao/:id`
- `PUT /api/partidas/:id/stats` (bulk: `{ stats: [{ timeId, chave, valor }] }`) — chaves: FINALIZACOES, FINALIZACOES_NO_GOL, ESCANTEIOS, FALTAS, IMPEDIMENTOS, POSSE.
- `GET /api/partidas/:id` agora retorna `{ partida, arbitragem, cronologia, observacoes, gols, cartoes, escalacao, substituicoes, stats }`

Após mudar o schema, aplicar com `npx prisma db push` (ou `--force-reset` em dev).

Fatias seguintes: stats extras, tema escuro, frontend das fatias 2–5.
