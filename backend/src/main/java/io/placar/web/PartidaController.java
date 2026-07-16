package io.placar.web;

import io.placar.service.PartidaService;
import io.placar.web.dto.PartidaDetalheDto;
import io.placar.web.dto.ResultadoRequest;
import io.placar.web.dto.RodadaDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PartidaController {

    private final PartidaService service;

    public PartidaController(PartidaService service) {
        this.service = service;
    }

    @PostMapping("/campeonatos/{campeonatoId}/gerar-rodadas")
    @ResponseStatus(HttpStatus.CREATED)
    public List<RodadaDto> gerarRodadas(@AuthenticationPrincipal Long usuarioId, @PathVariable Long campeonatoId) {
        return service.gerarRodadas(usuarioId, campeonatoId);
    }

    @GetMapping("/campeonatos/{campeonatoId}/partidas")
    public List<RodadaDto> listar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long campeonatoId) {
        return service.listar(usuarioId, campeonatoId);
    }

    @GetMapping("/partidas/{partidaId}")
    public PartidaDetalheDto obter(@AuthenticationPrincipal Long usuarioId, @PathVariable Long partidaId) {
        return service.obter(usuarioId, partidaId);
    }

    @PutMapping("/partidas/{partidaId}/resultado")
    public PartidaDetalheDto registrarResultado(@AuthenticationPrincipal Long usuarioId,
                                                @PathVariable Long partidaId,
                                                @Valid @RequestBody ResultadoRequest req) {
        return service.registrarResultado(usuarioId, partidaId, req);
    }
}
