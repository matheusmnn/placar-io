CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campeonatos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    nome VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE times (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id),
    nome VARCHAR(100) NOT NULL,
    escudo_url VARCHAR(255)
);

CREATE TABLE partidas (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id),
    time_mandante_id INTEGER NOT NULL REFERENCES times(id),
    time_visitante_id INTEGER NOT NULL REFERENCES times(id),
    gols_mandante INTEGER,
    gols_visitante INTEGER,
    rodada INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'agendada',
    data_partida TIMESTAMP
);