CREATE TABLE usuarios (
    id          BIGSERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha_hash  VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campeonatos (
    id             BIGSERIAL PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome           VARCHAR(100) NOT NULL,
    formato        VARCHAR(20)  NOT NULL DEFAULT 'PONTOS_CORRIDOS'
                   CHECK (formato IN ('PONTOS_CORRIDOS', 'MATA_MATA')),
    status         VARCHAR(20)  NOT NULL DEFAULT 'NAO_INICIADO'
                   CHECK (status IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'ENCERRADO')),
    pontos_vitoria INTEGER      NOT NULL DEFAULT 3 CHECK (pontos_vitoria >= 0),
    pontos_empate  INTEGER      NOT NULL DEFAULT 1 CHECK (pontos_empate >= 0),
    ida_volta      BOOLEAN      NOT NULL DEFAULT FALSE,
    data_inicio    DATE,
    data_fim       DATE,
    descricao      TEXT,
    logo_url       VARCHAR(255),
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campeonatos_usuario ON campeonatos(usuario_id);

CREATE TABLE times (
    id            BIGSERIAL PRIMARY KEY,
    campeonato_id BIGINT       NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    nome          VARCHAR(100) NOT NULL,
    cidade        VARCHAR(120),
    escudo_url    VARCHAR(255)
);

CREATE INDEX idx_times_campeonato ON times(campeonato_id);

CREATE TABLE jogadores (
    id        BIGSERIAL PRIMARY KEY,
    time_id   BIGINT       NOT NULL REFERENCES times(id) ON DELETE CASCADE,
    numero    INTEGER      CHECK (numero BETWEEN 1 AND 99),
    nome      VARCHAR(100) NOT NULL,
    posicao   VARCHAR(20)  CHECK (posicao IN
                  ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE')),
    UNIQUE (time_id, numero)
);

CREATE INDEX idx_jogadores_time ON jogadores(time_id);

CREATE TABLE partidas (
    id                 BIGSERIAL PRIMARY KEY,
    campeonato_id      BIGINT      NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    time_mandante_id   BIGINT      REFERENCES times(id) ON DELETE CASCADE,
    time_visitante_id  BIGINT      REFERENCES times(id) ON DELETE CASCADE,
    gols_mandante      INTEGER     CHECK (gols_mandante >= 0),
    gols_visitante     INTEGER     CHECK (gols_visitante >= 0),
    rodada             INTEGER     NOT NULL DEFAULT 1,
    fase               VARCHAR(20),
    ordem_fase         INTEGER,
    status             VARCHAR(20)  NOT NULL DEFAULT 'AGENDADA'
                       CHECK (status IN ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA')),
    data_partida       TIMESTAMP,
    local              VARCHAR(150),
    CHECK (time_mandante_id IS NULL OR time_visitante_id IS NULL
           OR time_mandante_id <> time_visitante_id)
);

CREATE INDEX idx_partidas_campeonato ON partidas(campeonato_id);

CREATE TABLE gols (
    id          BIGSERIAL PRIMARY KEY,
    partida_id  BIGINT  NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    time_id     BIGINT  NOT NULL REFERENCES times(id) ON DELETE CASCADE,
    jogador_id  BIGINT  REFERENCES jogadores(id) ON DELETE SET NULL,
    minuto      INTEGER CHECK (minuto BETWEEN 1 AND 120)
);

CREATE INDEX idx_gols_partida ON gols(partida_id);
CREATE INDEX idx_gols_jogador ON gols(jogador_id);

CREATE TABLE cartoes (
    id          BIGSERIAL PRIMARY KEY,
    partida_id  BIGINT      NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    time_id     BIGINT      NOT NULL REFERENCES times(id) ON DELETE CASCADE,
    jogador_id  BIGINT      REFERENCES jogadores(id) ON DELETE SET NULL,
    tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('AMARELO', 'VERMELHO')),
    minuto      INTEGER     CHECK (minuto BETWEEN 1 AND 120)
);

CREATE INDEX idx_cartoes_partida ON cartoes(partida_id);
