package io.placar.repository;

import io.placar.domain.Partida;
import io.placar.domain.StatusPartida;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartidaRepository extends JpaRepository<Partida, Long> {
    List<Partida> findByCampeonatoIdOrderByRodadaAscOrdemFaseAscIdAsc(Long campeonatoId);
    List<Partida> findByCampeonatoIdAndStatus(Long campeonatoId, StatusPartida status);
    long countByCampeonatoId(Long campeonatoId);

    void deleteByCampeonatoId(Long campeonatoId);
}
