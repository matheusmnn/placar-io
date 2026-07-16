package io.placar.web.dto;

import io.placar.domain.Time;

public record TimeResumoDto(Long id, String nome, String escudoUrl) {
    public static TimeResumoDto from(Time t) {
        return t == null ? null : new TimeResumoDto(t.getId(), t.getNome(), t.getEscudoUrl());
    }
}
