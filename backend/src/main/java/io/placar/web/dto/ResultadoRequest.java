package io.placar.web.dto;

import io.placar.domain.TipoCartao;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record ResultadoRequest(
        @NotNull @PositiveOrZero Integer golsMandante,
        @NotNull @PositiveOrZero Integer golsVisitante,
        @Valid List<GolInput> gols,
        @Valid List<CartaoInput> cartoes
) {
    public record GolInput(
            @NotNull Long timeId,
            Long jogadorId,
            @Min(1) @Max(120) Integer minuto
    ) {}

    public record CartaoInput(
            @NotNull Long timeId,
            Long jogadorId,
            @NotNull TipoCartao tipo,
            @Min(1) @Max(120) Integer minuto
    ) {}
}
