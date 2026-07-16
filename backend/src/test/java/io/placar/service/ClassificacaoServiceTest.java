package io.placar.service;

import io.placar.domain.Partida;
import io.placar.domain.StatusPartida;
import io.placar.domain.Time;
import io.placar.web.dto.ClassificacaoLinhaDto;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClassificacaoServiceTest {

    private Time time(long id, String nome) {
        Time t = new Time();
        t.setId(id);
        t.setNome(nome);
        return t;
    }

    private Partida jogo(Time mandante, Time visitante, int gm, int gv) {
        Partida p = new Partida();
        p.setMandante(mandante);
        p.setVisitante(visitante);
        p.setGolsMandante(gm);
        p.setGolsVisitante(gv);
        p.setStatus(StatusPartida.CONCLUIDA);
        return p;
    }

    @Test
    void calculaPontosVitoriasEmpatesEDerrotas() {
        Time a = time(1, "A");
        Time b = time(2, "B");
        Time c = time(3, "C");

        List<Partida> jogos = List.of(
                jogo(a, b, 2, 0),
                jogo(a, c, 1, 1),
                jogo(b, c, 0, 3)
        );

        List<ClassificacaoLinhaDto> tabela =
                ClassificacaoService.calcular(List.of(a, b, c), jogos, 3, 1);

        ClassificacaoLinhaDto la = tabela.stream().filter(l -> l.timeId() == 1L).findFirst().orElseThrow();
        ClassificacaoLinhaDto lb = tabela.stream().filter(l -> l.timeId() == 2L).findFirst().orElseThrow();
        ClassificacaoLinhaDto lc = tabela.stream().filter(l -> l.timeId() == 3L).findFirst().orElseThrow();

        assertThat(la.pontos()).isEqualTo(4);
        assertThat(la.vitorias()).isEqualTo(1);
        assertThat(la.empates()).isEqualTo(1);
        assertThat(la.golsPro()).isEqualTo(3);
        assertThat(la.golsContra()).isEqualTo(1);
        assertThat(la.saldo()).isEqualTo(2);

        assertThat(lc.pontos()).isEqualTo(4);
        assertThat(lc.saldo()).isEqualTo(3);

        assertThat(lb.pontos()).isZero();
        assertThat(lb.derrotas()).isEqualTo(2);
    }

    @Test
    void ordenaPorPontosDepoisSaldoDepoisGolsPro() {
        Time a = time(1, "A");
        Time b = time(2, "B");
        Time c = time(3, "C");

        List<Partida> jogos = List.of(
                jogo(a, b, 2, 0),
                jogo(a, c, 1, 1),
                jogo(b, c, 0, 3)
        );

        List<ClassificacaoLinhaDto> tabela =
                ClassificacaoService.calcular(List.of(a, b, c), jogos, 3, 1);

        assertThat(tabela).extracting(ClassificacaoLinhaDto::timeId)
                .containsExactly(3L, 1L, 2L);
        assertThat(tabela).extracting(ClassificacaoLinhaDto::posicao)
                .containsExactly(1, 2, 3);
    }

    @Test
    void ignoraPartidasNaoConcluidas() {
        Time a = time(1, "A");
        Time b = time(2, "B");
        Partida agendada = new Partida();
        agendada.setMandante(a);
        agendada.setVisitante(b);
        agendada.setStatus(StatusPartida.AGENDADA);

        List<ClassificacaoLinhaDto> tabela =
                ClassificacaoService.calcular(List.of(a, b), List.of(agendada), 3, 1);

        assertThat(tabela).allMatch(l -> l.jogos() == 0 && l.pontos() == 0);
    }
}
