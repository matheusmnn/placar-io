package io.placar.repository;

import io.placar.domain.Gol;
import io.placar.web.dto.ArtilheiroDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GolRepository extends JpaRepository<Gol, Long> {

    void deleteByPartidaId(Long partidaId);

    java.util.List<Gol> findByPartidaIdOrderByMinutoAsc(Long partidaId);

    @Query("""
            SELECT new io.placar.web.dto.ArtilheiroDto(
                       j.id, j.nome, t.id, t.nome, t.escudoUrl, COUNT(g))
            FROM Gol g
            JOIN g.time t
            JOIN g.jogador j
            WHERE g.partida.campeonato.id = :campeonatoId
            GROUP BY j.id, j.nome, t.id, t.nome, t.escudoUrl
            ORDER BY COUNT(g) DESC, j.nome ASC
            """)
    List<ArtilheiroDto> artilharia(@Param("campeonatoId") Long campeonatoId);

    @Query("SELECT COUNT(g) FROM Gol g WHERE g.partida.campeonato.id = :campeonatoId")
    long countByCampeonatoId(@Param("campeonatoId") Long campeonatoId);
}
