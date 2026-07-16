package io.placar.repository;

import io.placar.domain.Campeonato;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CampeonatoRepository extends JpaRepository<Campeonato, Long> {
    List<Campeonato> findByUsuarioIdOrderByCreatedAtDesc(Long usuarioId);
    List<Campeonato> findAllByOrderByCreatedAtDesc();
    Optional<Campeonato> findByIdAndUsuarioId(Long id, Long usuarioId);
}
