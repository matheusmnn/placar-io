package io.placar.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "times")
@Getter
@Setter
public class Time {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campeonato_id", nullable = false)
    private Campeonato campeonato;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 120)
    private String cidade;

    @Column(name = "escudo_url", length = 255)
    private String escudoUrl;
}
