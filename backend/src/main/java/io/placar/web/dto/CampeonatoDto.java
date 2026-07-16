package io.placar.web.dto;

import io.placar.domain.Campeonato;
import io.placar.domain.Formato;
import io.placar.domain.StatusCampeonato;

import java.time.LocalDate;

public record CampeonatoDto(
        Long id,
        String nome,
        Formato formato,
        StatusCampeonato status,
        int pontosVitoria,
        int pontosEmpate,
        boolean idaVolta,
        LocalDate dataInicio,
        LocalDate dataFim,
        String descricao,
        String logoUrl,
        long qtdTimes
) {
    public static CampeonatoDto from(Campeonato c, long qtdTimes) {
        return new CampeonatoDto(
                c.getId(), c.getNome(), c.getFormato(), c.getStatus(),
                c.getPontosVitoria(), c.getPontosEmpate(), c.isIdaVolta(),
                c.getDataInicio(), c.getDataFim(), c.getDescricao(), c.getLogoUrl(),
                qtdTimes);
    }
}
