package io.placar.web.dto;

import java.util.List;

public record PartidaDetalheDto(PartidaDto partida, List<GolDto> gols, List<CartaoDto> cartoes) {}
