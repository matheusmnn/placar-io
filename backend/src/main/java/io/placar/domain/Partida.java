package io.placar.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "partidas")
@Getter
@Setter
public class Partida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campeonato_id", nullable = false)
    private Campeonato campeonato;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "time_mandante_id")
    private Time mandante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "time_visitante_id")
    private Time visitante;

    @Column(name = "gols_mandante")
    private Integer golsMandante;

    @Column(name = "gols_visitante")
    private Integer golsVisitante;

    @Column(nullable = false)
    private int rodada = 1;

    @Column(length = 20)
    private String fase;

    @Column(name = "ordem_fase")
    private Integer ordemFase;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusPartida status = StatusPartida.AGENDADA;

    @Column(name = "data_partida")
    private Instant dataPartida;

    @Column(length = 150)
    private String local;
}
