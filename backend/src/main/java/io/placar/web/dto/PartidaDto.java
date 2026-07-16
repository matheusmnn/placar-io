package io.placar.web.dto;

import io.placar.domain.Partida;
import io.placar.domain.StatusPartida;

import java.time.Instant;

public record PartidaDto(
        Long id,
        int rodada,
        String fase,
        Integer ordemFase,
        StatusPartida status,
        Instant dataPartida,
        String local,
        TimeResumoDto mandante,
        TimeResumoDto visitante,
        Integer golsMandante,
        Integer golsVisitante
) {
    public static PartidaDto from(Partida p) {
        return new PartidaDto(
                p.getId(), p.getRodada(), p.getFase(), p.getOrdemFase(), p.getStatus(),
                p.getDataPartida(), p.getLocal(),
                TimeResumoDto.from(p.getMandante()), TimeResumoDto.from(p.getVisitante()),
                p.getGolsMandante(), p.getGolsVisitante());
    }
}
