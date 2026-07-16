package io.placar.web;

import io.placar.service.JogadorService;
import io.placar.web.dto.JogadorDto;
import io.placar.web.dto.JogadorRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class JogadorController {

    private final JogadorService service;

    public JogadorController(JogadorService service) {
        this.service = service;
    }

    @GetMapping("/times/{timeId}/jogadores")
    public List<JogadorDto> listar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long timeId) {
        return service.listar(usuarioId, timeId);
    }

    @PostMapping("/times/{timeId}/jogadores")
    @ResponseStatus(HttpStatus.CREATED)
    public JogadorDto criar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long timeId,
                            @Valid @RequestBody JogadorRequest req) {
        return service.criar(usuarioId, timeId, req);
    }

    @PutMapping("/jogadores/{jogadorId}")
    public JogadorDto atualizar(@AuthenticationPrincipal Long usuarioId, @PathVariable Long jogadorId,
                                @Valid @RequestBody JogadorRequest req) {
        return service.atualizar(usuarioId, jogadorId, req);
    }

    @DeleteMapping("/jogadores/{jogadorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Long usuarioId, @PathVariable Long jogadorId) {
        service.excluir(usuarioId, jogadorId);
    }
}
