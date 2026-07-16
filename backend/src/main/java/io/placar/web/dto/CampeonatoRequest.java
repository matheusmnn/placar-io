package io.placar.web.dto;

import io.placar.domain.Formato;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CampeonatoRequest(
        @NotBlank @Size(max = 100) String nome,
        Formato formato,
        @PositiveOrZero Integer pontosVitoria,
        @PositiveOrZero Integer pontosEmpate,
        Boolean idaVolta,
        LocalDate dataInicio,
        LocalDate dataFim,
        String descricao,
        @Size(max = 255) String logoUrl
) {}
