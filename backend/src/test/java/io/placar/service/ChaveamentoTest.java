package io.placar.service;

import io.placar.service.Chaveamento.Confronto;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ChaveamentoTest {

    @Test
    void pontosCorridosComQuatroTimes() {
        List<Confronto> jogos = Chaveamento.pontosCorridos(4, false);

        assertThat(jogos).hasSize(6);
        assertThat(jogos.stream().map(Confronto::posicao).distinct()).containsExactlyInAnyOrder(1, 2, 3);

        int[] jogosPorTime = new int[4];
        for (Confronto c : jogos) {
            jogosPorTime[c.mandante()]++;
            jogosPorTime[c.visitante()]++;
        }
        assertThat(jogosPorTime).containsExactly(3, 3, 3, 3);

        Set<String> pares = new HashSet<>();
        for (Confronto c : jogos) {
            int a = Math.min(c.mandante(), c.visitante());
            int b = Math.max(c.mandante(), c.visitante());
            assertThat(pares.add(a + "-" + b)).as("par %d-%d duplicado", a, b).isTrue();
        }
    }

    @Test
    void pontosCorridosComTimesImparesGeraBye() {
        List<Confronto> jogos = Chaveamento.pontosCorridos(3, false);

        assertThat(jogos).hasSize(3);
        int[] jogosPorTime = new int[3];
        for (Confronto c : jogos) {
            jogosPorTime[c.mandante()]++;
            jogosPorTime[c.visitante()]++;
        }
        assertThat(jogosPorTime).containsExactly(2, 2, 2);
    }

    @Test
    void pontosCorridosIdaEVoltaDobraOsJogos() {
        assertThat(Chaveamento.pontosCorridos(4, true)).hasSize(12);
    }

    @Test
    void mataMataPotenciaDeDoisNaoTemBye() {
        List<Confronto> jogos = Chaveamento.mataMataPrimeiraFase(4);
        assertThat(jogos).hasSize(2);
        assertThat(jogos).allMatch(c -> c.visitante() != Chaveamento.BYE);
    }

    @Test
    void mataMataComCincoTimesGeraTresByes() {
        List<Confronto> jogos = Chaveamento.mataMataPrimeiraFase(5);
        assertThat(jogos).hasSize(4);
        long byes = jogos.stream().filter(c -> c.visitante() == Chaveamento.BYE).count();
        assertThat(byes).isEqualTo(3);

        assertThat(jogos).allMatch(c -> c.mandante() != Chaveamento.BYE);
    }

    @Test
    void proximaPotenciaDeDois() {
        assertThat(Chaveamento.proximaPotenciaDeDois(2)).isEqualTo(2);
        assertThat(Chaveamento.proximaPotenciaDeDois(5)).isEqualTo(8);
        assertThat(Chaveamento.proximaPotenciaDeDois(8)).isEqualTo(8);
        assertThat(Chaveamento.proximaPotenciaDeDois(9)).isEqualTo(16);
    }

    @Test
    void faseLabel() {
        assertThat(Chaveamento.faseLabel(2)).isEqualTo("Final");
        assertThat(Chaveamento.faseLabel(4)).isEqualTo("Semifinal");
        assertThat(Chaveamento.faseLabel(8)).isEqualTo("Quartas");
        assertThat(Chaveamento.faseLabel(16)).isEqualTo("Oitavas");
    }
}
