package io.placar.web.dto;

import io.placar.domain.Campeonato;
import io.placar.domain.Formato;
import io.placar.domain.StatusCampeonato;

public record CampeonatoPublicoDto(
        Long id,
        String nome,
        Formato formato,
        StatusCampeonato status,
        String logoUrl,
        String descricao,
        long qtdTimes,
        long totalPartidas,
        long partidasJogadas,
        int rodadasTotais,
        int rodadasJogadas,
        long totalGols
) {
    public static CampeonatoPublicoDto of(
            Campeonato c, long qtdTimes, long totalPartidas, long partidasJogadas,
            int rodadasTotais, int rodadasJogadas, long totalGols) {
        return new CampeonatoPublicoDto(
                c.getId(), c.getNome(), c.getFormato(), c.getStatus(), c.getLogoUrl(), c.getDescricao(),
                qtdTimes, totalPartidas, partidasJogadas, rodadasTotais, rodadasJogadas, totalGols);
    }
}
