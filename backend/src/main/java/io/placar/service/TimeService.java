package io.placar.service;

import io.placar.domain.Campeonato;
import io.placar.domain.Time;
import io.placar.exception.NotFoundException;
import io.placar.repository.TimeRepository;
import io.placar.web.dto.TimeDto;
import io.placar.web.dto.TimeRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TimeService {

    private final TimeRepository timeRepository;
    private final CampeonatoService campeonatoService;

    public TimeService(TimeRepository timeRepository, CampeonatoService campeonatoService) {
        this.timeRepository = timeRepository;
        this.campeonatoService = campeonatoService;
    }

    @Transactional(readOnly = true)
    public Time getOwned(Long usuarioId, Long timeId) {
        Time t = timeRepository.findById(timeId)
                .orElseThrow(() -> new NotFoundException("Time nao encontrado"));
        if (!t.getCampeonato().getUsuario().getId().equals(usuarioId)) {
            throw new NotFoundException("Time nao encontrado");
        }
        return t;
    }

    @Transactional(readOnly = true)
    public List<TimeDto> listar(Long usuarioId, Long campeonatoId) {
        campeonatoService.getOwned(usuarioId, campeonatoId);
        return timeRepository.findByCampeonatoIdOrderByNomeAsc(campeonatoId).stream()
                .map(TimeDto::from).toList();
    }

    @Transactional
    public TimeDto criar(Long usuarioId, Long campeonatoId, TimeRequest req) {
        Campeonato c = campeonatoService.getOwned(usuarioId, campeonatoId);
        Time t = new Time();
        t.setCampeonato(c);
        aplicar(t, req);
        return TimeDto.from(timeRepository.save(t));
    }

    @Transactional
    public TimeDto atualizar(Long usuarioId, Long timeId, TimeRequest req) {
        Time t = getOwned(usuarioId, timeId);
        aplicar(t, req);
        return TimeDto.from(timeRepository.save(t));
    }

    @Transactional
    public void excluir(Long usuarioId, Long timeId) {
        Time t = getOwned(usuarioId, timeId);
        timeRepository.delete(t);
    }

    private void aplicar(Time t, TimeRequest req) {
        t.setNome(req.nome().trim());
        t.setCidade(req.cidade());
        t.setEscudoUrl(req.escudoUrl());
    }
}
