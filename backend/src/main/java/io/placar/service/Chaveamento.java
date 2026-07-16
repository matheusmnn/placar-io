package io.placar.service;

import java.util.ArrayList;
import java.util.List;

public final class Chaveamento {

    private Chaveamento() {}

    public record Confronto(int posicao, int mandante, int visitante) {}

    public static final int BYE = -1;

    public static List<Confronto> pontosCorridos(int n, boolean idaVolta) {
        List<Integer> arr = new ArrayList<>();
        for (int i = 0; i < n; i++) arr.add(i);
        if (arr.size() % 2 != 0) arr.add(BYE);

        int m = arr.size();
        int rodadas = m - 1;
        int metade = m / 2;
        List<Confronto> turno = new ArrayList<>();

        for (int r = 0; r < rodadas; r++) {
            for (int i = 0; i < metade; i++) {
                int mandante = arr.get(i);
                int visitante = arr.get(m - 1 - i);
                if (mandante == BYE || visitante == BYE) continue;

                if (r % 2 == 1) {
                    int tmp = mandante;
                    mandante = visitante;
                    visitante = tmp;
                }
                turno.add(new Confronto(r + 1, mandante, visitante));
            }

            Integer ultimo = arr.remove(m - 1);
            arr.add(1, ultimo);
        }

        List<Confronto> resultado = new ArrayList<>(turno);
        if (idaVolta) {
            for (Confronto c : turno) {
                resultado.add(new Confronto(c.posicao() + rodadas, c.visitante(), c.mandante()));
            }
        }
        return resultado;
    }

    public static List<Confronto> mataMataPrimeiraFase(int n) {
        int size = proximaPotenciaDeDois(n);
        int[] seeds = new int[size];
        for (int i = 0; i < size; i++) seeds[i] = i < n ? i : BYE;

        List<Confronto> pares = new ArrayList<>();
        for (int i = 0; i < size / 2; i++) {

            pares.add(new Confronto(i, seeds[i], seeds[size - 1 - i]));
        }
        return pares;
    }

    public static int proximaPotenciaDeDois(int n) {
        int p = 1;
        while (p < n) p *= 2;
        return p;
    }

    public static String faseLabel(int timesNaFase) {
        return switch (timesNaFase) {
            case 1, 2 -> "Final";
            case 4 -> "Semifinal";
            case 8 -> "Quartas";
            case 16 -> "Oitavas";
            default -> (timesNaFase / 2) + "-avos";
        };
    }
}
