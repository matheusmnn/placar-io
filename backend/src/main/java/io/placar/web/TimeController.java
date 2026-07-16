package io.placar.web;

import io.placar.service.TimeService;
import io.placar.web.dto.TimeDto;
import io.placar.web.dto.TimeRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TimeController {

    private final TimeService service;

    public TimeController(TimeService service) {
        this.service = service;
    }

    @GetMapping("/campeonatos/{campeonatoId}/times")
    public List<TimeDto> listar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long campeonatoId) {
        return service.listar(usuarioId, campeonatoId);
    }

    @PostMapping("/campeonatos/{campeonatoId}/times")
    @ResponseStatus(HttpStatus.CREATED)
    public TimeDto criar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long campeonatoId,
                         @Valid @RequestBody TimeRequest req) {
        return service.criar(usuarioId, campeonatoId, req);
    }

    @PutMapping("/times/{timeId}")
    public TimeDto atualizar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long timeId,
                             @Valid @RequestBody TimeRequest req) {
        return service.atualizar(usuarioId, timeId, req);
    }

    @DeleteMapping("/times/{timeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Long usuarioId, @PathVariable Long timeId) {
        service.excluir(usuarioId, timeId);
    }
}
