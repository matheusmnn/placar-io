# 🏆 Placar.IO

O **Placar.IO** é um sistema web para gerenciamento e automação de campeonatos esportivos no formato de pontos corridos. O objetivo da plataforma é substituir planilhas manuais, oferecendo uma interface web intuitiva para organizadores e uma página pública transparente para torcedores acompanharem os resultados.

## 🚀 Funcionalidades Principais

* **Autenticação:** Cadastro e login exclusivo para organizadores.
* **Gestão de Ligas:** Criação de campeonatos definindo nome, esporte e inclusão de escudos/logos via URL.
* **Gestão de Times:** Cadastro das equipes participantes da liga.
* **Gerador de Rodadas:** Motor interno que utiliza o algoritmo *Round Robin* para gerar automaticamente todos os confrontos da competição.
* **Gestão de Partidas:** Painel administrativo para inserção e atualização dos placares dos jogos.
* **Motor de Classificação:** Cálculo em tempo real da tabela de classificação (pontos, vitórias, empates, derrotas e saldo de gols) sempre que um placar é atualizado.
* **Dashboard Público:** Página web com URL compartilhável onde qualquer visitante pode visualizar a tabela de classificação em tempo real, sem necessidade de login.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React, Vite e Tailwind CSS.
* **Backend:** Node.js.
* **Banco de Dados:** PostgreSQL.

## 🗄️ Entidades do Sistema

A modelagem do banco de dados foca nas quatro entidades essenciais para o funcionamento do motor de classificação:
1. **Usuários:** Responsáveis por administrar os campeonatos.
2. **Campeonatos:** Agrupa as configurações gerais da liga.
3. **Times:** Equipes que competem no campeonato.
4. **Partidas:** Registra os confrontos entre os times e os placares finais.

## 🗄️ Modelagem de Dados
Aqui está a estrutura das tabelas do Placar.IO:

![Diagrama do Banco de Dados](./docs/DB-PLACAR.IO.png)
