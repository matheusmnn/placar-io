package io.placar.web.dto;

public record ClassificacaoLinhaDto(
        int posicao,
        Long timeId,
        String nome,
        String escudoUrl,
        int pontos,
        int jogos,
        int vitorias,
        int empates,
        int derrotas,
        int golsPro,
        int golsContra,
        int saldo
) {}
