package io.placar.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "campeonatos")
@Getter
@Setter
public class Campeonato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 100)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Formato formato = Formato.PONTOS_CORRIDOS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusCampeonato status = StatusCampeonato.NAO_INICIADO;

    @Column(name = "pontos_vitoria", nullable = false)
    private int pontosVitoria = 3;

    @Column(name = "pontos_empate", nullable = false)
    private int pontosEmpate = 1;

    @Column(name = "ida_volta", nullable = false)
    private boolean idaVolta = false;

    @Column(name = "data_inicio")
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;

    @Column(columnDefinition = "text")
    private String descricao;

    @Column(name = "logo_url", length = 255)
    private String logoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
