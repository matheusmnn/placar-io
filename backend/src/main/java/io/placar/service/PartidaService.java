package io.placar.service;

import io.placar.domain.*;
import io.placar.exception.BadRequestException;
import io.placar.exception.NotFoundException;
import io.placar.repository.*;
import io.placar.web.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PartidaService {

    private final PartidaRepository partidaRepository;
    private final TimeRepository timeRepository;
    private final JogadorRepository jogadorRepository;
    private final GolRepository golRepository;
    private final CartaoRepository cartaoRepository;
    private final CampeonatoRepository campeonatoRepository;
    private final CampeonatoService campeonatoService;

    public PartidaService(PartidaRepository partidaRepository, TimeRepository timeRepository,
                          JogadorRepository jogadorRepository, GolRepository golRepository,
                          CartaoRepository cartaoRepository, CampeonatoRepository campeonatoRepository,
                          CampeonatoService campeonatoService) {
        this.partidaRepository = partidaRepository;
        this.timeRepository = timeRepository;
        this.jogadorRepository = jogadorRepository;
        this.golRepository = golRepository;
        this.cartaoRepository = cartaoRepository;
        this.campeonatoRepository = campeonatoRepository;
        this.campeonatoService = campeonatoService;
    }

    @Transactional
    public List<RodadaDto> gerarRodadas(Long usuarioId, Long campeonatoId) {
        Campeonato c = campeonatoService.getOwned(usuarioId, campeonatoId);
        List<Time> times = timeRepository.findByCampeonatoIdOrderByNomeAsc(campeonatoId);
        if (times.size() < 2) {
            throw new BadRequestException("Cadastre pelo menos 2 times antes de gerar as rodadas");
        }

        partidaRepository.deleteByCampeonatoId(campeonatoId);
        partidaRepository.flush();

        List<Partida> criadas = new ArrayList<>();
        if (c.getFormato() == Formato.PONTOS_CORRIDOS) {
            for (Chaveamento.Confronto conf : Chaveamento.pontosCorridos(times.size(), c.isIdaVolta())) {
                Partida p = new Partida();
                p.setCampeonato(c);
                p.setMandante(times.get(conf.mandante()));
                p.setVisitante(times.get(conf.visitante()));
                p.setRodada(conf.posicao());
                criadas.add(p);
            }
        } else {
            String label = Chaveamento.faseLabel(Chaveamento.proximaPotenciaDeDois(times.size()));
            for (Chaveamento.Confronto conf : Chaveamento.mataMataPrimeiraFase(times.size())) {
                Partida p = new Partida();
                p.setCampeonato(c);
                p.setMandante(times.get(conf.mandante()));
                p.setRodada(1);
                p.setOrdemFase(conf.posicao());
                p.setFase(label);
                if (conf.visitante() == Chaveamento.BYE) {
                    p.setVisitante(null);
                    p.setStatus(StatusPartida.CONCLUIDA);
                } else {
                    p.setVisitante(times.get(conf.visitante()));
                }
                criadas.add(p);
            }
        }
        partidaRepository.saveAll(criadas);

        c.setStatus(StatusCampeonato.EM_ANDAMENTO);
        campeonatoRepository.save(c);

        if (c.getFormato() == Formato.MATA_MATA) {
            partidaRepository.flush();
            verificarAvancoMataMata(c, 1);
        }
        return agrupar(partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(campeonatoId),
                c.getFormato());
    }

    @Transactional
    public PartidaDetalheDto registrarResultado(Long usuarioId, Long partidaId, ResultadoRequest req) {
        Partida p = getOwnedPartida(usuarioId, partidaId);
        if (p.getMandante() == null || p.getVisitante() == null) {
            throw new BadRequestException("Essa partida nao pode receber resultado");
        }
        Campeonato c = p.getCampeonato();
        boolean mataMata = c.getFormato() == Formato.MATA_MATA;
        if (mataMata && req.golsMandante().equals(req.golsVisitante())) {
            throw new BadRequestException("No mata-mata a partida precisa ter um vencedor");
        }

        List<Gol> golsNovos = validarGols(p, req);
        List<Cartao> cartoesNovos = validarCartoes(p, req);

        p.setGolsMandante(req.golsMandante());
        p.setGolsVisitante(req.golsVisitante());
        p.setStatus(StatusPartida.CONCLUIDA);
        partidaRepository.save(p);

        golRepository.deleteByPartidaId(partidaId);
        cartaoRepository.deleteByPartidaId(partidaId);
        golRepository.flush();
        cartaoRepository.flush();
        golRepository.saveAll(golsNovos);
        cartaoRepository.saveAll(cartoesNovos);

        if (mataMata) {
            verificarAvancoMataMata(c, p.getRodada());
        } else {
            verificarEncerramento(c);
        }
        return detalhe(p);
    }

    private List<Gol> validarGols(Partida p, ResultadoRequest req) {
        List<Gol> gols = new ArrayList<>();
        if (req.gols() == null || req.gols().isEmpty()) return gols;
        int mand = 0, vis = 0;
        for (ResultadoRequest.GolInput gi : req.gols()) {
            Time time = resolverTime(p, gi.timeId());
            if (time.getId().equals(p.getMandante().getId())) mand++; else vis++;
            Gol g = new Gol();
            g.setPartida(p);
            g.setTime(time);
            g.setJogador(resolverJogador(gi.jogadorId(), time));
            g.setMinuto(gi.minuto());
            gols.add(g);
        }
        if (mand != req.golsMandante() || vis != req.golsVisitante()) {
            throw new BadRequestException(
                    "A quantidade de gols detalhados nao bate com o placar informado");
        }
        return gols;
    }

    private List<Cartao> validarCartoes(Partida p, ResultadoRequest req) {
        List<Cartao> cartoes = new ArrayList<>();
        if (req.cartoes() == null) return cartoes;
        for (ResultadoRequest.CartaoInput ci : req.cartoes()) {
            Time time = resolverTime(p, ci.timeId());
            Cartao ca = new Cartao();
            ca.setPartida(p);
            ca.setTime(time);
            ca.setJogador(resolverJogador(ci.jogadorId(), time));
            ca.setTipo(ci.tipo());
            ca.setMinuto(ci.minuto());
            cartoes.add(ca);
        }
        return cartoes;
    }

    private Time resolverTime(Partida p, Long timeId) {
        if (p.getMandante() != null && p.getMandante().getId().equals(timeId)) return p.getMandante();
        if (p.getVisitante() != null && p.getVisitante().getId().equals(timeId)) return p.getVisitante();
        throw new BadRequestException("O time informado nao participa dessa partida");
    }

    private Jogador resolverJogador(Long jogadorId, Time time) {
        if (jogadorId == null) return null;
        Jogador j = jogadorRepository.findById(jogadorId)
                .orElseThrow(() -> new BadRequestException("Jogador nao encontrado"));
        if (!j.getTime().getId().equals(time.getId())) {
            throw new BadRequestException("O jogador nao pertence ao time informado");
        }
        return j;
    }

    private void verificarAvancoMataMata(Campeonato c, int rodada) {
        List<Partida> todas = partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(c.getId());
        List<Partida> faseAtual = todas.stream().filter(p -> p.getRodada() == rodada).toList();
        if (faseAtual.isEmpty()) return;
        boolean completa = faseAtual.stream().allMatch(p -> p.getStatus() == StatusPartida.CONCLUIDA);
        if (!completa) return;

        List<Time> vencedores = faseAtual.stream()
                .sorted((a, b) -> Integer.compare(nvl(a.getOrdemFase()), nvl(b.getOrdemFase())))
                .map(this::vencedor)
                .toList();

        if (vencedores.size() == 1) {
            c.setStatus(StatusCampeonato.ENCERRADO);
            campeonatoRepository.save(c);
            return;
        }

        boolean proximaJaExiste = todas.stream().anyMatch(p -> p.getRodada() == rodada + 1);
        if (proximaJaExiste) return;

        String label = Chaveamento.faseLabel(vencedores.size());
        List<Partida> proxima = new ArrayList<>();
        for (int i = 0; i < vencedores.size() / 2; i++) {
            Partida p = new Partida();
            p.setCampeonato(c);
            p.setMandante(vencedores.get(2 * i));
            p.setVisitante(vencedores.get(2 * i + 1));
            p.setRodada(rodada + 1);
            p.setOrdemFase(i);
            p.setFase(label);
            proxima.add(p);
        }
        partidaRepository.saveAll(proxima);
    }

    private Time vencedor(Partida p) {
        if (p.getVisitante() == null) return p.getMandante();
        if (p.getMandante() == null) return p.getVisitante();
        int gm = nvl(p.getGolsMandante()), gv = nvl(p.getGolsVisitante());
        return gm >= gv ? p.getMandante() : p.getVisitante();
    }

    private void verificarEncerramento(Campeonato c) {
        List<Partida> todas = partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(c.getId());
        boolean todasConcluidas = !todas.isEmpty()
                && todas.stream().allMatch(p -> p.getStatus() == StatusPartida.CONCLUIDA);
        c.setStatus(todasConcluidas ? StatusCampeonato.ENCERRADO : StatusCampeonato.EM_ANDAMENTO);
        campeonatoRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<RodadaDto> listar(Long usuarioId, Long campeonatoId) {
        Campeonato c = campeonatoService.getOwned(usuarioId, campeonatoId);
        return agrupar(partidaRepository.findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(campeonatoId),
                c.getFormato());
    }

    @Transactional(readOnly = true)
    public PartidaDetalheDto obter(Long usuarioId, Long partidaId) {
        return detalhe(getOwnedPartida(usuarioId, partidaId));
    }

    private PartidaDetalheDto detalhe(Partida p) {
        List<GolDto> gols = golRepository.findByPartidaIdOrderByMinutoAsc(p.getId())
                .stream().map(GolDto::from).toList();
        List<CartaoDto> cartoes = cartaoRepository.findByPartidaIdOrderByMinutoAsc(p.getId())
                .stream().map(CartaoDto::from).toList();
        return new PartidaDetalheDto(PartidaDto.from(p), gols, cartoes);
    }

    List<RodadaDto> agrupar(List<Partida> partidas, Formato formato) {
        Map<Integer, List<Partida>> porRodada = new LinkedHashMap<>();
        for (Partida p : partidas) {
            porRodada.computeIfAbsent(p.getRodada(), k -> new ArrayList<>()).add(p);
        }
        List<RodadaDto> out = new ArrayList<>();
        for (Map.Entry<Integer, List<Partida>> e : porRodada.entrySet()) {
            String titulo;
            if (formato == Formato.MATA_MATA) {
                titulo = e.getValue().isEmpty() ? "Fase " + e.getKey() : e.getValue().get(0).getFase();
            } else {
                titulo = "Rodada " + e.getKey();
            }
            out.add(new RodadaDto(titulo, e.getValue().stream().map(PartidaDto::from).toList()));
        }
        return out;
    }

    private Partida getOwnedPartida(Long usuarioId, Long partidaId) {
        Partida p = partidaRepository.findById(partidaId)
                .orElseThrow(() -> new NotFoundException("Partida nao encontrada"));
        if (!p.getCampeonato().getUsuario().getId().equals(usuarioId)) {
            throw new NotFoundException("Partida nao encontrada");
        }
        return p;
    }

    private static int nvl(Integer v) {
        return v == null ? 0 : v;
    }
}
