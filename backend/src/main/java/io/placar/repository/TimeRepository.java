package io.placar.repository;

import io.placar.domain.Time;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimeRepository extends JpaRepository<Time, Long> {
    List<Time> findByCampeonatoIdOrderByNomeAsc(Long campeonatoId);
    long countByCampeonatoId(Long campeonatoId);
}
