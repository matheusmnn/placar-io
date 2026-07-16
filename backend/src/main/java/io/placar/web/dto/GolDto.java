package io.placar.web.dto;

import io.placar.domain.Gol;

public record GolDto(Long id, Long timeId, Long jogadorId, String jogadorNome, Integer minuto) {
    public static GolDto from(Gol g) {
        return new GolDto(
                g.getId(),
                g.getTime().getId(),
                g.getJogador() == null ? null : g.getJogador().getId(),
                g.getJogador() == null ? null : g.getJogador().getNome(),
                g.getMinuto());
    }
}
