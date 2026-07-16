package io.placar.web;

import io.placar.service.CampeonatoService;
import io.placar.web.dto.CampeonatoDto;
import io.placar.web.dto.CampeonatoRequest;
import io.placar.web.dto.CampeonatosResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/campeonatos")
public class CampeonatoController {

    private final CampeonatoService service;

    public CampeonatoController(CampeonatoService service) {
        this.service = service;
    }

    @GetMapping
    public CampeonatosResponse listar(@AuthenticationPrincipal Long usuarioId) {
        return service.listar(usuarioId);
    }

    @GetMapping("/{id}")
    public CampeonatoDto obter(@AuthenticationPrincipal Long usuarioId, @PathVariable Long id) {
        return service.obter(usuarioId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampeonatoDto criar(@AuthenticationPrincipal Long usuarioId, @Valid @RequestBody CampeonatoRequest req) {
        return service.criar(usuarioId, req);
    }

    @PutMapping("/{id}")
    public CampeonatoDto atualizar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long id,
                                   @Valid @RequestBody CampeonatoRequest req) {
        return service.atualizar(usuarioId, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Long usuarioId, @PathVariable Long id) {
        service.excluir(usuarioId, id);
    }
}
