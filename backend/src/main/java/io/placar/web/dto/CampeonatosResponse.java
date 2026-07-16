package io.placar.web.dto;

import java.util.List;

public record CampeonatosResponse(Stats stats, List<CampeonatoDto> campeonatos) {

    public record Stats(long total, long emAndamento, long naoIniciados, long encerrados) {}
}
