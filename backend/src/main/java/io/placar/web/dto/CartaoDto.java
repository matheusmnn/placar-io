package io.placar.web.dto;

import io.placar.domain.Cartao;
import io.placar.domain.TipoCartao;

public record CartaoDto(Long id, Long timeId, Long jogadorId, String jogadorNome, TipoCartao tipo, Integer minuto) {
    public static CartaoDto from(Cartao c) {
        return new CartaoDto(
                c.getId(),
                c.getTime().getId(),
                c.getJogador() == null ? null : c.getJogador().getId(),
                c.getJogador() == null ? null : c.getJogador().getNome(),
                c.getTipo(),
                c.getMinuto());
    }
}
