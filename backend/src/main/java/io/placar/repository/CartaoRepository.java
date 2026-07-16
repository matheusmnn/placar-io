package io.placar.repository;

import io.placar.domain.Cartao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartaoRepository extends JpaRepository<Cartao, Long> {
    void deleteByPartidaId(Long partidaId);

    java.util.List<Cartao> findByPartidaIdOrderByMinutoAsc(Long partidaId);
}
