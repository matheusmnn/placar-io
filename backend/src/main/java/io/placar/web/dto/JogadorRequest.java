package io.placar.web.dto;

import io.placar.domain.Posicao;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JogadorRequest(
        @Min(1) @Max(99) Integer numero,
        @NotBlank @Size(max = 100) String nome,
        Posicao posicao
) {}
