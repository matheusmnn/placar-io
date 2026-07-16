# CSI606-2026-01 - Remoto - Trabalho Final - Resultados

## Discente: Matheus Martins Nunes

## Resumo

O Placar.io é um sistema web para gestão de campeonatos amadores de futebol. Ele resolve
a dificuldade que organizadores de peladas, ligas de bairro e torneios têm para manter
tabela, resultados e estatísticas de forma organizada, o que normalmente é feito em
planilhas ou no papel.

Com o sistema, o organizador cria um campeonato (nos formatos pontos corridos ou
mata-mata), cadastra os times e seus jogadores, gera as rodadas ou o chaveamento
automaticamente e registra o resultado de cada partida, incluindo gols e cartões. Qualquer
pessoa pode acompanhar o campeonato por uma página pública, sem login, com classificação,
artilharia, rodadas e o chaveamento.

O projeto é dividido em um backend em Java (Spring Boot) que expõe uma API REST e
armazena os dados em um banco PostgreSQL, e um frontend em React (TypeScript) que consome
essa API.

## 1. Tecnologias utilizadas — Backend e Frontend

**Backend**
- Java 21
- Spring Boot 3 (Spring Web para a API REST)
- Spring Data JPA / Hibernate (mapeamento objeto-relacional)
- Spring Security com autenticação via JWT (biblioteca jjwt) e senhas criptografadas com BCrypt
- PostgreSQL (banco de dados relacional)
- Flyway (versionamento e migração do banco por scripts SQL)
- Bean Validation (validação dos dados de entrada)
- Maven (build e gerenciamento de dependências)
- JUnit 5 (testes automatizados)

**Frontend**
- React 18 com TypeScript
- Vite (build e servidor de desenvolvimento)
- Tailwind CSS (estilização)
- shadcn/ui (componentes baseados em Radix UI)
- React Router (navegação)
- Lucide (ícones)

**Arquitetura**: o backend segue uma organização em camadas — Controller (recebe as
requisições) → Service (regras de negócio) → Repository (acesso ao banco) → Entidade
(modelo). O frontend acessa o backend por uma camada de API tipada, guardando o token de
sessão e protegendo as rotas do organizador.

## 2. Funcionalidades implementadas

- Cadastro e login de organizadores, com token JWT e rotas protegidas.
- Criação, listagem, edição e exclusão de campeonatos, escolhendo o formato (pontos
  corridos ou mata-mata) e a pontuação (pontos por vitória e por empate).
- Cadastro e exclusão de times por campeonato.
- Cadastro e exclusão de jogadores por time (com número da camisa e posição).
- Geração automática das partidas:
  - Pontos corridos: tabela em que todos se enfrentam (com opção de turno e returno),
    distribuída em rodadas.
  - Mata-mata: chaveamento por eliminação direta, com o vencedor avançando automaticamente
    até a final (inclusive tratando times que folgam quando o número não é potência de dois).
- Registro do resultado de cada partida, com detalhamento de gols (jogador e minuto) e
  cartões (amarelo/vermelho).
- Cálculo automático da classificação (pontos, jogos, vitórias, empates, derrotas, gols
  pró/contra e saldo, com ordenação por pontos, saldo e gols pró).
- Ranking de artilharia (goleadores do campeonato).
- Páginas públicas (sem login) para cada campeonato: classificação, chaveamento (quando é
  mata-mata), artilharia e rodadas com os placares.
- Página inicial pública listando os campeonatos existentes.

## 3. Funcionalidades previstas e não implementadas

- **Login com Google / redes sociais (OAuth)**: a autenticação foi feita apenas com
  e-mail e senha.
- **Recuperação de senha**: o envio de e-mail e a redefinição de senha não foram
  implementados.
- **Notificações e e-mails** (por exemplo, avisar os times sobre as próximas partidas).
- **Busca de campeonatos** na página inicial.
- **Upload de imagem** para escudos dos times e logo do campeonato (as imagens só podem ser
  informadas por URL).
- **Critérios de desempate no mata-mata** (prorrogação/pênaltis): a partida eliminatória
  exige um vencedor no tempo normal.

## 4. Outras funcionalidades implementadas

Funcionalidades que não estavam no escopo inicial e foram acrescentadas durante o
desenvolvimento:

- **Visualização em chaveamento (bracket)** para os campeonatos de mata-mata, destacando o
  vencedor de cada confronto.
- **Testes automatizados** (15 testes), incluindo testes de integração que sobem um
  PostgreSQL real embarcado, sem depender de banco instalado na máquina.
- **Migração e seed do banco com Flyway**: o esquema é criado automaticamente no primeiro
  start, junto com uma conta de demonstração.
- **Turno e returno (ida e volta)** opcionais no formato pontos corridos.
- **Docker Compose** como alternativa para subir o banco de dados sem instalação manual.
- **Tratamento de sessão no frontend**: verificação de expiração do token e logout
  automático em caso de sessão inválida.

## 5. Principais desafios e dificuldades

- **Geração das partidas**: implementar o algoritmo de tabela em pontos corridos (método
  do círculo / round-robin) garantindo que todos se enfrentem sem repetição, e o
  chaveamento do mata-mata com avanço automático dos vencedores e tratamento dos times que
  folgam quando o total não é potência de dois.
- **Cálculo da classificação**: aplicar corretamente os critérios de ordenação (pontos,
  saldo e gols pró) a partir das partidas concluídas.
- **Segurança e integração**: configurar o Spring Security com JWT e o CORS para que o
  frontend em outra porta pudesse consumir a API, além de tratar as respostas 401 no
  cliente sem encerrar a sessão de forma inesperada.
- **Modelagem do domínio**: relacionar campeonatos, times, jogadores, partidas, gols e
  cartões, e decidir o que é armazenado (partidas) e o que é calculado (classificação e
  artilharia).
- **Ambiente de desenvolvimento**: configurar o PostgreSQL e o Maven, e coordenar a
  execução do backend e do frontend simultaneamente.

## 6. Instruções para instalação e execução

**Pré-requisitos**: Java 21, Maven, Node.js 18+ e PostgreSQL 14+.

**1) Banco de dados** — criar o banco e o usuário que a aplicação espera:

```bash
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER placar WITH PASSWORD 'placar';"
sudo -u postgres psql -c "CREATE DATABASE placar OWNER placar;"
```

As tabelas e a conta de demonstração são criadas automaticamente pelo Flyway no primeiro
start do backend. (Alternativa: `cd backend && docker compose up -d` para subir o banco
via Docker.)

**2) Backend** — na pasta `backend`:

```bash
mvn spring-boot:run
```

A API sobe em http://localhost:8080. Aguarde a mensagem `Started PlacarApplication`.

**3) Frontend** — na pasta `frontend`:

```bash
npm install
npm run dev
```

A aplicação abre em http://localhost:5173.

**Acesso de demonstração**: e-mail `demo@placar.io`, senha `demo12345` (ou crie uma conta
nova em "Cadastrar").

**Testes do backend** (opcional): na pasta `backend`, executar `mvn test`.

## 7. Referências

SPRING. **Spring Boot Reference Documentation**. VMware, 2024. Disponível em:
https://docs.spring.io/spring-boot/documentation.html. Acesso em: 9 jun. 2026.

SPRING. **Spring Data JPA — Reference Documentation**. VMware, 2024. Disponível em:
https://docs.spring.io/spring-data/jpa/reference/. Acesso em: 11 jun. 2026.

SPRING. **Spring Security — Reference**. VMware, 2024. Disponível em:
https://docs.spring.io/spring-security/reference/. Acesso em: 12 jun. 2026.

REACT. **React Documentation**. Meta Open Source, 2024. Disponível em:
https://react.dev/. Acesso em: 17 jun. 2026.

THE POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL 16 Documentation**. 2024.
Disponível em: https://www.postgresql.org/docs/16/. Acesso em: 20 jun. 2026.

FLYWAY. **Flyway Documentation**. Redgate, 2024. Disponível em:
https://documentation.red-gate.com/flyway. Acesso em: 23 jun. 2026.

TAILWIND LABS. **Tailwind CSS Documentation**. 2024. Disponível em:
https://tailwindcss.com/docs. Acesso em: 26 jun. 2026.
