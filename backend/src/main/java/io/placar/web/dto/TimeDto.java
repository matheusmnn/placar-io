package io.placar.web.dto;

import io.placar.domain.Time;

public record TimeDto(Long id, Long campeonatoId, String nome, String cidade, String escudoUrl) {
    public static TimeDto from(Time t) {
        return new TimeDto(t.getId(), t.getCampeonato().getId(), t.getNome(), t.getCidade(), t.getEscudoUrl());
    }
}
