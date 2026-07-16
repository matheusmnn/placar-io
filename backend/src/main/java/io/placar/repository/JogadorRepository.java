package io.placar.repository;

import io.placar.domain.Jogador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JogadorRepository extends JpaRepository<Jogador, Long> {
    List<Jogador> findByTimeIdOrderByNumeroAsc(Long timeId);
    boolean existsByTimeIdAndNumero(Long timeId, Integer numero);
}
