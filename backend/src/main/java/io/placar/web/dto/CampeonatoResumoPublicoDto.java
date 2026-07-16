package io.placar.web.dto;

import io.placar.domain.Campeonato;
import io.placar.domain.Formato;
import io.placar.domain.StatusCampeonato;

import java.time.LocalDate;

public record CampeonatoResumoPublicoDto(
        Long id,
        String nome,
        Formato formato,
        StatusCampeonato status,
        LocalDate dataInicio,
        LocalDate dataFim,
        long qtdTimes
) {
    public static CampeonatoResumoPublicoDto from(Campeonato c, long qtdTimes) {
        return new CampeonatoResumoPublicoDto(
                c.getId(), c.getNome(), c.getFormato(), c.getStatus(),
                c.getDataInicio(), c.getDataFim(), qtdTimes);
    }
}
