package io.placar.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TimeRequest(
        @NotBlank @Size(max = 100) String nome,
        @Size(max = 120) String cidade,
        @Size(max = 255) String escudoUrl
) {}
