-- CreateEnum
CREATE TYPE "Formato" AS ENUM ('PONTOS_CORRIDOS', 'MATA_MATA', 'GRUPOS', 'GRUPOS_MATA_MATA', 'PONTOS_CORRIDOS_MATA_MATA');

-- CreateEnum
CREATE TYPE "StatusCampeonato" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusPartida" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "Posicao" AS ENUM ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE');

-- CreateEnum
CREATE TYPE "TipoCartao" AS ENUM ('AMARELO', 'VERMELHO');

-- CreateEnum
CREATE TYPE "KoDesempate" AS ENUM ('PENALTIS', 'PRORROGACAO_PENALTIS');

-- CreateEnum
CREATE TYPE "FuncaoComissao" AS ENUM ('TECNICO', 'ASSISTENTE_TECNICO', 'MEDICO', 'TREINADOR_GOLEIROS', 'PREPARADOR_FISICO', 'FISIOTERAPEUTA', 'MASSAGISTA');

-- CreateEnum
CREATE TYPE "TipoEscalacao" AS ENUM ('TITULAR', 'RESERVA');

-- CreateEnum
CREATE TYPE "Periodo" AS ENUM ('PRIMEIRO_TEMPO', 'SEGUNDO_TEMPO');

-- CreateEnum
CREATE TYPE "TipoGol" AS ENUM ('NORMAL', 'PENALTI', 'CONTRA', 'FALTA');

-- CreateEnum
CREATE TYPE "ChaveStat" AS ENUM ('FINALIZACOES', 'FINALIZACOES_NO_GOL', 'ESCANTEIOS', 'FALTAS', 'IMPEDIMENTOS', 'POSSE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campeonato" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "formato" "Formato" NOT NULL DEFAULT 'PONTOS_CORRIDOS',
    "status" "StatusCampeonato" NOT NULL DEFAULT 'NAO_INICIADO',
    "pontosVitoria" INTEGER NOT NULL DEFAULT 3,
    "pontosEmpate" INTEGER NOT NULL DEFAULT 1,
    "idaVolta" BOOLEAN NOT NULL DEFAULT false,
    "koDesempate" "KoDesempate" NOT NULL DEFAULT 'PENALTIS',
    "numGrupos" INTEGER,
    "avancamPorGrupo" INTEGER,
    "criteriosDesempate" JSONB,
    "playoff" JSONB,
    "faixasTabela" JSONB,
    "sumulaConfig" JSONB,
    "campeonatoVinculadoId" INTEGER,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "descricao" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campeonato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArbitroCampeonato" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArbitroCampeonato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Time" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "escudoUrl" TEXT,
    "cor" TEXT,
    "abreviacao" TEXT,

    CONSTRAINT "Time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscricaoCampeonato" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "grupoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscricaoCampeonato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogador" (
    "id" SERIAL NOT NULL,
    "timeId" INTEGER NOT NULL,
    "numero" INTEGER,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "nomeCompleto" TEXT,
    "registro" TEXT,
    "profissional" BOOLEAN NOT NULL DEFAULT true,
    "posicao" "Posicao",

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComissaoTecnica" (
    "id" SERIAL NOT NULL,
    "timeId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" "FuncaoComissao" NOT NULL,

    CONSTRAINT "ComissaoTecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" SERIAL NOT NULL,
    "campeonatoId" INTEGER NOT NULL,
    "mandanteId" INTEGER,
    "visitanteId" INTEGER,
    "golsMandante" INTEGER,
    "golsVisitante" INTEGER,
    "rodada" INTEGER NOT NULL,
    "fase" TEXT,
    "ordemFase" INTEGER,
    "legOrdem" INTEGER,
    "grupoId" INTEGER,
    "prorrogacao" BOOLEAN NOT NULL DEFAULT false,
    "golsMandanteProrr" INTEGER,
    "golsVisitanteProrr" INTEGER,
    "penaltisMandante" INTEGER,
    "penaltisVisitante" INTEGER,
    "status" "StatusPartida" NOT NULL DEFAULT 'AGENDADA',
    "dataPartida" TIMESTAMP(3),
    "local" TEXT,
    "transmissao" TEXT,
    "camposArbitragemOcultos" JSONB,
    "camposCustom" JSONB,
    "juizId" INTEGER,
    "assistente1Id" INTEGER,
    "assistente2Id" INTEGER,
    "quartoArbitroId" INTEGER,
    "varId" INTEGER,
    "avarId" INTEGER,
    "avar2Id" INTEGER,
    "observadorVarId" INTEGER,
    "entradaMandante" TIMESTAMP(3),
    "entradaVisitante" TIMESTAMP(3),
    "inicio1T" TIMESTAMP(3),
    "termino1T" TIMESTAMP(3),
    "acrescimo1T" INTEGER,
    "inicio2T" TIMESTAMP(3),
    "termino2T" TIMESTAMP(3),
    "acrescimo2T" INTEGER,
    "placar1TMandante" INTEGER,
    "placar1TVisitante" INTEGER,
    "ocorrencias" TEXT,
    "motivoAtraso" TEXT,
    "observacoesEventuais" TEXT,
    "relatorioAssistente" TEXT,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatPartida" (
    "id" SERIAL NOT NULL,
    "partidaId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "chave" "ChaveStat" NOT NULL,
    "valor" INTEGER NOT NULL,

    CONSTRAINT "StatPartida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaAuxiliar" (
    "partidaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "PartidaAuxiliar_pkey" PRIMARY KEY ("partidaId","usuarioId")
);

-- CreateTable
CREATE TABLE "PartidaEscalacao" (
    "id" SERIAL NOT NULL,
    "partidaId" INTEGER NOT NULL,
    "jogadorId" INTEGER NOT NULL,
    "tipo" "TipoEscalacao" NOT NULL,

    CONSTRAINT "PartidaEscalacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substituicao" (
    "id" SERIAL NOT NULL,
    "partidaId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "tempoSegundos" INTEGER,
    "periodo" "Periodo" NOT NULL,
    "entrouJogadorId" INTEGER NOT NULL,
    "saiuJogadorId" INTEGER NOT NULL,

    CONSTRAINT "Substituicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gol" (
    "id" SERIAL NOT NULL,
    "partidaId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "jogadorId" INTEGER,
    "minuto" INTEGER,
    "tempoSegundos" INTEGER,
    "tipo" "TipoGol" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "Gol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cartao" (
    "id" SERIAL NOT NULL,
    "partidaId" INTEGER NOT NULL,
    "timeId" INTEGER NOT NULL,
    "jogadorId" INTEGER,
    "tipo" "TipoCartao" NOT NULL,
    "minuto" INTEGER,
    "tempoSegundos" INTEGER,
    "motivoCodigo" TEXT,
    "motivoDescricao" TEXT,

    CONSTRAINT "Cartao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "ArbitroCampeonato_campeonatoId_idx" ON "ArbitroCampeonato"("campeonatoId");

-- CreateIndex
CREATE UNIQUE INDEX "ArbitroCampeonato_campeonatoId_email_key" ON "ArbitroCampeonato"("campeonatoId", "email");

-- CreateIndex
CREATE INDEX "Time_usuarioId_idx" ON "Time"("usuarioId");

-- CreateIndex
CREATE INDEX "InscricaoCampeonato_campeonatoId_idx" ON "InscricaoCampeonato"("campeonatoId");

-- CreateIndex
CREATE INDEX "InscricaoCampeonato_timeId_idx" ON "InscricaoCampeonato"("timeId");

-- CreateIndex
CREATE UNIQUE INDEX "InscricaoCampeonato_campeonatoId_timeId_key" ON "InscricaoCampeonato"("campeonatoId", "timeId");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_campeonatoId_nome_key" ON "Grupo"("campeonatoId", "nome");

-- CreateIndex
CREATE INDEX "Partida_campeonatoId_idx" ON "Partida"("campeonatoId");

-- CreateIndex
CREATE INDEX "StatPartida_partidaId_idx" ON "StatPartida"("partidaId");

-- CreateIndex
CREATE UNIQUE INDEX "StatPartida_partidaId_timeId_chave_key" ON "StatPartida"("partidaId", "timeId", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "PartidaEscalacao_partidaId_jogadorId_key" ON "PartidaEscalacao"("partidaId", "jogadorId");

-- CreateIndex
CREATE INDEX "Substituicao_partidaId_idx" ON "Substituicao"("partidaId");

-- CreateIndex
CREATE INDEX "Gol_partidaId_idx" ON "Gol"("partidaId");

-- CreateIndex
CREATE INDEX "Cartao_partidaId_idx" ON "Cartao"("partidaId");

-- AddForeignKey
ALTER TABLE "Campeonato" ADD CONSTRAINT "Campeonato_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campeonato" ADD CONSTRAINT "Campeonato_campeonatoVinculadoId_fkey" FOREIGN KEY ("campeonatoVinculadoId") REFERENCES "Campeonato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitroCampeonato" ADD CONSTRAINT "ArbitroCampeonato_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Time" ADD CONSTRAINT "Time_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoCampeonato" ADD CONSTRAINT "InscricaoCampeonato_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoCampeonato" ADD CONSTRAINT "InscricaoCampeonato_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoCampeonato" ADD CONSTRAINT "InscricaoCampeonato_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogador" ADD CONSTRAINT "Jogador_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoTecnica" ADD CONSTRAINT "ComissaoTecnica_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_mandanteId_fkey" FOREIGN KEY ("mandanteId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_visitanteId_fkey" FOREIGN KEY ("visitanteId") REFERENCES "Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_juizId_fkey" FOREIGN KEY ("juizId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatPartida" ADD CONSTRAINT "StatPartida_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatPartida" ADD CONSTRAINT "StatPartida_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaAuxiliar" ADD CONSTRAINT "PartidaAuxiliar_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaAuxiliar" ADD CONSTRAINT "PartidaAuxiliar_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaEscalacao" ADD CONSTRAINT "PartidaEscalacao_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaEscalacao" ADD CONSTRAINT "PartidaEscalacao_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substituicao" ADD CONSTRAINT "Substituicao_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substituicao" ADD CONSTRAINT "Substituicao_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substituicao" ADD CONSTRAINT "Substituicao_entrouJogadorId_fkey" FOREIGN KEY ("entrouJogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substituicao" ADD CONSTRAINT "Substituicao_saiuJogadorId_fkey" FOREIGN KEY ("saiuJogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gol" ADD CONSTRAINT "Gol_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gol" ADD CONSTRAINT "Gol_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gol" ADD CONSTRAINT "Gol_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartao" ADD CONSTRAINT "Cartao_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartao" ADD CONSTRAINT "Cartao_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "Time"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartao" ADD CONSTRAINT "Cartao_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
