# Súmula configurável por campeonato

## Intenção

Hoje toda partida renderiza a mesma súmula (seções fixas: header, arbitragem, escalação, cronologia, gols, cartões, placar, observações etc.). O organizador quer poder, para cada campeonato que organiza, **ligar/desligar seções** e **acrescentar campos avulsos** criados por ele. A configuração vale para todas as partidas daquele campeonato.

## Por quê

O organizador conhece a cara da súmula que o campeonato dele usa: alguns campeonatos amadores não têm VAR, nem assistente, nem substituição formal; outros querem registrar "clima", "renda bruta", "público pagante". Hoje ele preenche campos que não usa ou não tem onde registrar o que precisa.

## Objetivos

- Organizador acessa "Configurar súmula" pela página do campeonato (área admin).
- Pode desligar seções inteiras da súmula padrão.
- Pode adicionar campos avulsos (label + tipo) que passam a aparecer em toda partida do campeonato.
- Botão "Salvar como súmula padrão" persiste a configuração no campeonato.
- `RegisterResult.tsx` respeita a configuração: só mostra seções ligadas; renderiza inputs dos campos custom; guarda os valores por partida.

## Não-objetivos

- Templates compartilhados entre campeonatos.
- Configurações por partida (overrides locais).
- Tipos complexos: datas, listas de opções, obrigatoriedade, validação por regra — ficam para depois.
- Reordenação de seções.
- Histórico de alterações da configuração.

## Anti-objetivos (como isso falha mesmo "funcionando")

- Mudar a súmula padrão retroativa reescrever dados antigos: **não**. A config é lida só pra renderizar; dados já salvos ficam como estão.
- Bloquear súmulas existentes se um campo custom for removido depois: **não**. Valor salvo em partida permanece até alguém editar.

## Restrições

- Backend é ESM JavaScript (não TypeScript).
- Postgres via Prisma. Campos JSON já são usados no projeto (ex.: `Campeonato.playoff`, `Partida.camposArbitragemOcultos`).
- Frontend: shadcn tokens, tema escuro default.
- `frontend/src/lib/api.ts` é a fonte de verdade do contrato — tem que ser atualizado junto da rota.

## Como

### Modelo

- `Campeonato.sumulaConfig Json?` — forma:
  ```json
  {
    "secoes": {
      "arbitragem": true,
      "escalacao": true,
      "cronologia": true,
      "gols": true,
      "cartoes": true,
      "placar": true,
      "observacoes": true
    },
    "camposCustom": [
      { "id": "clima", "label": "Clima", "tipo": "texto" },
      { "id": "publico", "label": "Público pagante", "tipo": "numero" }
    ]
  }
  ```
  `secoes` é dict chave→boolean; omitir chave = ligada (default). `camposCustom` é lista; `id` é slug kebab-case único por campeonato. `tipo ∈ {"texto","numero","boolean"}`.

- `Partida.camposCustom Json?` — dict `{ [id]: string | number | boolean }`. Valores de campos que não existem mais na config simplesmente não renderizam.

### Backend

- `GET /campeonatos/:id/sumula-config` — retorna a config (ou um default calculado quando null) — qualquer leitor da partida pode chamar; já que a config é renderizada nas súmulas públicas também, colocar no mesmo lugar que outras rotas públicas do campeonato (`publicoRouter`) **se** precisar; se só admin usa, deixar em `campeonatosRouter` com `authRequired` + `assertDonoDoCampeonato`. **Call do builder: admin-only no primeiro corte.**
- `PUT /campeonatos/:id/sumula-config` — `authRequired` + `assertDonoDoCampeonato`. Body validado por zod com shape acima. Grava.
- `GET/PUT /partidas/:id/campos-custom` — opcional. **Call do builder:** reaproveitar `PUT /partidas/:id/dados` existente, adicionando `camposCustom` ao `dadosSchema`. Zero rota nova.

### Frontend

- Nova tela `ConfigurarSumula.tsx` em `components/screens/`. Rota `/dashboard/sumula`.
- Link "Configurar súmula" na página do campeonato (Dashboard admin, próximo das outras ações de campeonato).
- Lista de toggles para as seções (shadcn `Switch` ou `Checkbox`).
- Lista de campos custom com `Input` (label), `Select` (tipo), botão X para remover, botão "Adicionar campo".
- Botão principal "Salvar como súmula padrão" no rodapé.
- `api.ts`: adiciona `getSumulaConfig(campId)`, `salvarSumulaConfig(campId, cfg)`.
- `RegisterResult.tsx`: carrega config junto com partida; cada seção renderiza-se envolta por `{ligada('secao') && <Section/>}`. Nova subseção "Campos custom" entre observações e placar renderiza os `camposCustom` da config como inputs; onChange salva via `salvarDadosPartida({ camposCustom: ... })`.

### Teste mínimo

- `backend/src/routes/campeonatos.sumulaConfig.test.js` (ou embutido em teste existente): salva uma config, lê de volta, confere shape.
- Sem teste de frontend (não tem infra de teste de UI no repo).

## O que fica para o builder decidir

- Onde exatamente encaixar o link "Configurar súmula" na página do campeonato (visual, não funcional).
- Copy dos labels e do botão.
- Se usa shadcn `Switch` ou `Checkbox` para os toggles (consistência com telas vizinhas).
- Layout da tela de configuração (uma coluna; agrupar seções e campos custom em dois blocos).
- Default implícito quando `sumulaConfig` é null: todas as seções ligadas, zero campos custom.
