package io.placar.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "gols")
@Getter
@Setter
public class Gol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partida_id", nullable = false)
    private Partida partida;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "time_id", nullable = false)
    private Time time;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "jogador_id")
    private Jogador jogador;

    private Integer minuto;
}
