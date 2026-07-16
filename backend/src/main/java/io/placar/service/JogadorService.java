package io.placar.service;

import io.placar.domain.Jogador;
import io.placar.domain.Time;
import io.placar.exception.ConflictException;
import io.placar.exception.NotFoundException;
import io.placar.repository.JogadorRepository;
import io.placar.web.dto.JogadorDto;
import io.placar.web.dto.JogadorRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JogadorService {

    private final JogadorRepository jogadorRepository;
    private final TimeService timeService;

    public JogadorService(JogadorRepository jogadorRepository, TimeService timeService) {
        this.jogadorRepository = jogadorRepository;
        this.timeService = timeService;
    }

    @Transactional(readOnly = true)
    public List<JogadorDto> listar(Long usuarioId, Long timeId) {
        timeService.getOwned(usuarioId, timeId);
        return jogadorRepository.findByTimeIdOrderByNumeroAsc(timeId).stream()
                .map(JogadorDto::from).toList();
    }

    @Transactional
    public JogadorDto criar(Long usuarioId, Long timeId, JogadorRequest req) {
        Time t = timeService.getOwned(usuarioId, timeId);
        if (req.numero() != null && jogadorRepository.existsByTimeIdAndNumero(timeId, req.numero())) {
            throw new ConflictException("Ja existe um jogador com o numero " + req.numero() + " nesse time");
        }
        Jogador j = new Jogador();
        j.setTime(t);
        j.setNumero(req.numero());
        j.setNome(req.nome().trim());
        j.setPosicao(req.posicao());
        return JogadorDto.from(jogadorRepository.save(j));
    }

    @Transactional
    public JogadorDto atualizar(Long usuarioId, Long jogadorId, JogadorRequest req) {
        Jogador j = getOwned(usuarioId, jogadorId);
        if (req.numero() != null && !req.numero().equals(j.getNumero())
                && jogadorRepository.existsByTimeIdAndNumero(j.getTime().getId(), req.numero())) {
            throw new ConflictException("Ja existe um jogador com o numero " + req.numero() + " nesse time");
        }
        j.setNumero(req.numero());
        j.setNome(req.nome().trim());
        j.setPosicao(req.posicao());
        return JogadorDto.from(jogadorRepository.save(j));
    }

    @Transactional
    public void excluir(Long usuarioId, Long jogadorId) {
        Jogador j = getOwned(usuarioId, jogadorId);
        jogadorRepository.delete(j);
    }

    private Jogador getOwned(Long usuarioId, Long jogadorId) {
        Jogador j = jogadorRepository.findById(jogadorId)
                .orElseThrow(() -> new NotFoundException("Jogador nao encontrado"));
        if (!j.getTime().getCampeonato().getUsuario().getId().equals(usuarioId)) {
            throw new NotFoundException("Jogador nao encontrado");
        }
        return j;
    }
}
