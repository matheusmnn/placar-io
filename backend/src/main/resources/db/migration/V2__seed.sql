INSERT INTO usuarios (id, nome, email, senha_hash) VALUES
    (1, 'Organizador Demo', 'demo@placar.io',
     '$2a$10$qaTm6Dby3hVDo0hwrlsfWuG0zvEnhHv8sTAf5fJFjoU84sDmNxShC');

SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));
