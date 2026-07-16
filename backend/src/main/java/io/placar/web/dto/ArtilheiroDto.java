package io.placar.web.dto;

public record ArtilheiroDto(
        Long jogadorId,
        String jogadorNome,
        Long timeId,
        String timeNome,
        String escudoUrl,
        long gols
) {}
