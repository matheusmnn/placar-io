package io.placar.service;

import io.placar.domain.Campeonato;
import io.placar.domain.Formato;
import io.placar.domain.Partida;
import io.placar.domain.StatusPartida;
import io.placar.domain.Time;
import io.placar.exception.NotFoundException;
import io.placar.repository.CampeonatoRepository;
import io.placar.repository.GolRepository;
import io.placar.repository.PartidaRepository;
import io.placar.repository.TimeRepository;
import io.placar.web.dto.ArtilheiroDto;
import io.placar.web.dto.CampeonatoPublicoDto;
import io.placar.web.dto.CampeonatoResumoPublicoDto;
import io.placar.web.dto.ClassificacaoLinhaDto;
import io.placar.web.dto.RodadaDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ConsultaPublicaService {

    private final CampeonatoRepository campeonatoRepository;
    private final TimeRepository timeRepository;
    private final PartidaRepository partidaRepository;
    private final GolRepository golRepository;
    private final PartidaService partidaService;

    public ConsultaPublicaService(CampeonatoRepository campeonatoRepository, TimeRepository timeRepository,
                                  PartidaRepository partidaRepository, GolRepository golRepository,
                                  PartidaService partidaService) {
        this.campeonatoRepository = campeonatoRepository;
        this.timeRepository = timeRepository;
        this.partidaRepository = partidaRepository;
        this.golRepository = golRepository;
        this.partidaService = partidaService;
    }

    private Campeonato get(Long campeonatoId) {
        return campeonatoRepository.findById(campeonatoId)
                .orElseThrow(() -> new NotFoundException("Campeonato nao encontrado"));
    }

    @Transactional(readOnly = true)
    public List<CampeonatoResumoPublicoDto> listar() {
        return campeonatoRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> CampeonatoResumoPublicoDto.from(c, timeRepository.countByCampeonatoId(c.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CampeonatoPublicoDto cabecalho(Long campeonatoId) {
        Campeonato c = get(campeonatoId);
        List<Partida> partidas = partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(campeonatoId);
        long total = partidas.size();
        long jogadas = partidas.stream().filter(p -> p.getStatus() == StatusPartida.CONCLUIDA).count();
        int rodadasTotais = partidas.stream().mapToInt(Partida::getRodada).max().orElse(0);
        int rodadasJogadas = partidas.stream()
                .filter(p -> p.getStatus() == StatusPartida.CONCLUIDA)
                .mapToInt(Partida::getRodada).max().orElse(0);
        long qtdTimes = timeRepository.countByCampeonatoId(campeonatoId);
        long totalGols = golRepository.countByCampeonatoId(campeonatoId);
        return CampeonatoPublicoDto.of(c, qtdTimes, total, jogadas, rodadasTotais, rodadasJogadas, totalGols);
    }

    @Transactional(readOnly = true)
    public List<ClassificacaoLinhaDto> classificacao(Long campeonatoId) {
        Campeonato c = get(campeonatoId);
        List<Time> times = timeRepository.findByCampeonatoIdOrderByNomeAsc(campeonatoId);
        List<Partida> partidas = partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(campeonatoId);
        return ClassificacaoService.calcular(times, partidas, c.getPontosVitoria(), c.getPontosEmpate());
    }

    @Transactional(readOnly = true)
    public List<ArtilheiroDto> artilharia(Long campeonatoId) {
        get(campeonatoId);
        return golRepository.artilharia(campeonatoId);
    }

    @Transactional(readOnly = true)
    public List<RodadaDto> rodadas(Long campeonatoId) {
        Campeonato c = get(campeonatoId);
        List<Partida> partidas = partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(campeonatoId);
        return partidaService.agrupar(partidas, c.getFormato());
    }
}
