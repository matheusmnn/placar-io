package io.placar.service;

import io.placar.domain.Campeonato;
import io.placar.domain.Formato;
import io.placar.domain.StatusCampeonato;
import io.placar.domain.Usuario;
import io.placar.exception.NotFoundException;
import io.placar.repository.CampeonatoRepository;
import io.placar.repository.TimeRepository;
import io.placar.repository.UsuarioRepository;
import io.placar.web.dto.CampeonatoDto;
import io.placar.web.dto.CampeonatoRequest;
import io.placar.web.dto.CampeonatosResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CampeonatoService {

    private final CampeonatoRepository campeonatoRepository;
    private final TimeRepository timeRepository;
    private final UsuarioRepository usuarioRepository;

    public CampeonatoService(CampeonatoRepository campeonatoRepository,
                             TimeRepository timeRepository,
                             UsuarioRepository usuarioRepository) {
        this.campeonatoRepository = campeonatoRepository;
        this.timeRepository = timeRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public Campeonato getOwned(Long usuarioId, Long campeonatoId) {
        return campeonatoRepository.findByIdAndUsuarioId(campeonatoId, usuarioId)
                .orElseThrow(() -> new NotFoundException("Campeonato nao encontrado"));
    }

    @Transactional(readOnly = true)
    public CampeonatosResponse listar(Long usuarioId) {
        List<Campeonato> lista = campeonatoRepository.findByUsuarioIdOrderByCreatedAtDesc(usuarioId);
        List<CampeonatoDto> dtos = lista.stream()
                .map(c -> CampeonatoDto.from(c, timeRepository.countByCampeonatoId(c.getId())))
                .toList();
        long total = lista.size();
        long emAndamento = lista.stream().filter(c -> c.getStatus() == StatusCampeonato.EM_ANDAMENTO).count();
        long naoIniciados = lista.stream().filter(c -> c.getStatus() == StatusCampeonato.NAO_INICIADO).count();
        long encerrados = lista.stream().filter(c -> c.getStatus() == StatusCampeonato.ENCERRADO).count();
        return new CampeonatosResponse(
                new CampeonatosResponse.Stats(total, emAndamento, naoIniciados, encerrados), dtos);
    }

    @Transactional(readOnly = true)
    public CampeonatoDto obter(Long usuarioId, Long campeonatoId) {
        Campeonato c = getOwned(usuarioId, campeonatoId);
        return CampeonatoDto.from(c, timeRepository.countByCampeonatoId(c.getId()));
    }

    @Transactional
    public CampeonatoDto criar(Long usuarioId, CampeonatoRequest req) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        Campeonato c = new Campeonato();
        c.setUsuario(usuario);
        aplicar(c, req);
        c = campeonatoRepository.save(c);
        return CampeonatoDto.from(c, 0);
    }

    @Transactional
    public CampeonatoDto atualizar(Long usuarioId, Long campeonatoId, CampeonatoRequest req) {
        Campeonato c = getOwned(usuarioId, campeonatoId);
        aplicar(c, req);
        c = campeonatoRepository.save(c);
        return CampeonatoDto.from(c, timeRepository.countByCampeonatoId(c.getId()));
    }

    @Transactional
    public void excluir(Long usuarioId, Long campeonatoId) {
        Campeonato c = getOwned(usuarioId, campeonatoId);
        campeonatoRepository.delete(c);
    }

    private void aplicar(Campeonato c, CampeonatoRequest req) {
        c.setNome(req.nome().trim());
        if (req.formato() != null) c.setFormato(req.formato());
        if (req.pontosVitoria() != null) c.setPontosVitoria(req.pontosVitoria());
        if (req.pontosEmpate() != null) c.setPontosEmpate(req.pontosEmpate());
        if (req.idaVolta() != null) c.setIdaVolta(req.idaVolta());
        c.setDataInicio(req.dataInicio());
        c.setDataFim(req.dataFim());
        c.setDescricao(req.descricao());
        c.setLogoUrl(req.logoUrl());
    }
}
