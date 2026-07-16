package io.placar.service;

import io.placar.domain.Partida;
import io.placar.domain.StatusPartida;
import io.placar.domain.Time;
import io.placar.web.dto.ClassificacaoLinhaDto;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ClassificacaoService {

    private ClassificacaoService() {}

    private static final class Linha {
        final Time time;
        int pontos, jogos, vitorias, empates, derrotas, golsPro, golsContra;
        Linha(Time time) { this.time = time; }
        int saldo() { return golsPro - golsContra; }
    }

    public static List<ClassificacaoLinhaDto> calcular(
            List<Time> times, List<Partida> partidas, int pontosVitoria, int pontosEmpate) {

        Map<Long, Linha> tabela = new LinkedHashMap<>();
        for (Time t : times) tabela.put(t.getId(), new Linha(t));

        for (Partida p : partidas) {
            if (p.getStatus() != StatusPartida.CONCLUIDA) continue;
            if (p.getMandante() == null || p.getVisitante() == null) continue;
            if (p.getGolsMandante() == null || p.getGolsVisitante() == null) continue;

            Linha m = tabela.get(p.getMandante().getId());
            Linha v = tabela.get(p.getVisitante().getId());
            if (m == null || v == null) continue;

            int gm = p.getGolsMandante();
            int gv = p.getGolsVisitante();
            m.jogos++; v.jogos++;
            m.golsPro += gm; m.golsContra += gv;
            v.golsPro += gv; v.golsContra += gm;

            if (gm > gv) {
                m.vitorias++; m.pontos += pontosVitoria; v.derrotas++;
            } else if (gm < gv) {
                v.vitorias++; v.pontos += pontosVitoria; m.derrotas++;
            } else {
                m.empates++; v.empates++;
                m.pontos += pontosEmpate; v.pontos += pontosEmpate;
            }
        }

        List<Linha> linhas = new ArrayList<>(tabela.values());
        linhas.sort(Comparator
                .comparingInt((Linha l) -> l.pontos).reversed()
                .thenComparing(Comparator.comparingInt(Linha::saldo).reversed())
                .thenComparing(Comparator.comparingInt((Linha l) -> l.golsPro).reversed())
                .thenComparing(l -> l.time.getNome(), String.CASE_INSENSITIVE_ORDER));

        List<ClassificacaoLinhaDto> out = new ArrayList<>();
        int pos = 1;
        for (Linha l : linhas) {
            out.add(new ClassificacaoLinhaDto(
                    pos++, l.time.getId(), l.time.getNome(), l.time.getEscudoUrl(),
                    l.pontos, l.jogos, l.vitorias, l.empates, l.derrotas,
                    l.golsPro, l.golsContra, l.saldo()));
        }
        return out;
    }
}
