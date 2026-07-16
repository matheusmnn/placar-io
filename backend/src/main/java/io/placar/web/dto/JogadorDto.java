package io.placar.web.dto;

import io.placar.domain.Jogador;
import io.placar.domain.Posicao;

public record JogadorDto(Long id, Long timeId, Integer numero, String nome, Posicao posicao) {
    public static JogadorDto from(Jogador j) {
        return new JogadorDto(j.getId(), j.getTime().getId(), j.getNumero(), j.getNome(), j.getPosicao());
    }
}
