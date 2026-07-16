package io.placar.web;

import io.placar.service.ConsultaPublicaService;
import io.placar.web.dto.ArtilheiroDto;
import io.placar.web.dto.CampeonatoPublicoDto;
import io.placar.web.dto.CampeonatoResumoPublicoDto;
import io.placar.web.dto.ClassificacaoLinhaDto;
import io.placar.web.dto.RodadaDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/campeonatos")
public class PublicController {

    private final ConsultaPublicaService service;

    public PublicController(ConsultaPublicaService service) {
        this.service = service;
    }

    @GetMapping
    public List<CampeonatoResumoPublicoDto> listar() {
        return service.listar();
    }

    @GetMapping("/{campeonatoId}")
    public CampeonatoPublicoDto cabecalho(@PathVariable Long campeonatoId) {
        return service.cabecalho(campeonatoId);
    }

    @GetMapping("/{campeonatoId}/classificacao")
    public List<ClassificacaoLinhaDto> classificacao(@PathVariable Long campeonatoId) {
        return service.classificacao(campeonatoId);
    }

    @GetMapping("/{campeonatoId}/artilharia")
    public List<ArtilheiroDto> artilharia(@PathVariable Long campeonatoId) {
        return service.artilharia(campeonatoId);
    }

    @GetMapping("/{campeonatoId}/rodadas")
    public List<RodadaDto> rodadas(@PathVariable Long campeonatoId) {
        return service.rodadas(campeonatoId);
    }
}
