package io.placar;

import io.placar.domain.Formato;
import io.placar.service.*;
import io.placar.web.dto.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracaoTest {

    static EmbeddedPostgres pg;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) throws IOException {
        if (pg == null) {
            pg = EmbeddedPostgres.builder().start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try { pg.close(); } catch (IOException ignored) {}
            }));
        }
        registry.add("spring.datasource.url", () -> pg.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }

    @Autowired AuthService authService;
    @Autowired CampeonatoService campeonatoService;
    @Autowired TimeService timeService;
    @Autowired PartidaService partidaService;
    @Autowired ConsultaPublicaService consultaPublicaService;
    @Autowired TestRestTemplate rest;

    private Long registrar(String email) {
        AuthResponse r = authService.register(new RegisterRequest("Fulano", email, "senha1234"));
        return r.usuario().id();
    }

    private CampeonatoDto criarCampeonato(Long userId, Formato formato) {
        return campeonatoService.criar(userId, new CampeonatoRequest(
                "Teste " + formato, formato, 3, 1, false, null, null, null, null));
    }

    private Long addTime(Long userId, Long campId, String nome) {
        return timeService.criar(userId, campId, new TimeRequest(nome, null, null)).id();
    }

    @Test
    void fluxoPontosCorridosCalculaClassificacao() {
        Long userId = registrar("liga@teste.com");
        CampeonatoDto camp = criarCampeonato(userId, Formato.PONTOS_CORRIDOS);
        Long tA = addTime(userId, camp.id(), "A");
        Long tB = addTime(userId, camp.id(), "B");
        Long tC = addTime(userId, camp.id(), "C");
        Long tD = addTime(userId, camp.id(), "D");

        List<RodadaDto> rodadas = partidaService.gerarRodadas(userId, camp.id());
        long totalJogos = rodadas.stream().mapToLong(r -> r.partidas().size()).sum();
        assertThat(totalJogos).isEqualTo(6);

        for (RodadaDto r : rodadas) {
            for (PartidaDto p : r.partidas()) {
                boolean aEhMandante = p.mandante().id().equals(tA);
                boolean aEhVisitante = p.visitante().id().equals(tA);
                int gm = aEhMandante ? 3 : 0;
                int gv = aEhVisitante ? 3 : 0;
                if (!aEhMandante && !aEhVisitante) { gm = 1; gv = 1; }
                partidaService.registrarResultado(userId, p.id(),
                        new ResultadoRequest(gm, gv, List.of(), List.of()));
            }
        }

        List<ClassificacaoLinhaDto> tabela = consultaPublicaService.classificacao(camp.id());
        assertThat(tabela).hasSize(4);
        assertThat(tabela.get(0).timeId()).isEqualTo(tA);
        assertThat(tabela.get(0).pontos()).isEqualTo(9);
        assertThat(tabela.get(0).jogos()).isEqualTo(3);

        assertThat(campeonatoService.obter(userId, camp.id()).status().name()).isEqualTo("ENCERRADO");
    }

    @Test
    void mataMataAvancaVencedorAteFinal() {
        Long userId = registrar("copa@teste.com");
        CampeonatoDto camp = criarCampeonato(userId, Formato.MATA_MATA);
        Long t1 = addTime(userId, camp.id(), "T1");
        Long t2 = addTime(userId, camp.id(), "T2");
        Long t3 = addTime(userId, camp.id(), "T3");
        Long t4 = addTime(userId, camp.id(), "T4");

        List<RodadaDto> fases = partidaService.gerarRodadas(userId, camp.id());

        assertThat(fases).hasSize(1);
        assertThat(fases.get(0).partidas()).hasSize(2);

        for (PartidaDto p : fases.get(0).partidas()) {
            partidaService.registrarResultado(userId, p.id(),
                    new ResultadoRequest(2, 1, List.of(), List.of()));
        }

        List<RodadaDto> comFinal = partidaService.listar(userId, camp.id());
        assertThat(comFinal).anyMatch(r -> r.titulo().equals("Final"));
        PartidaDto finalJogo = comFinal.stream()
                .filter(r -> r.titulo().equals("Final")).findFirst().orElseThrow()
                .partidas().get(0);

        partidaService.registrarResultado(userId, finalJogo.id(),
                new ResultadoRequest(1, 0, List.of(), List.of()));

        assertThat(campeonatoService.obter(userId, camp.id()).status().name()).isEqualTo("ENCERRADO");
    }

    @Test
    void listaPublicaMostraCampeonatosCriadosSemAutenticacao() {
        Long userId = registrar("publica@teste.com");
        CampeonatoDto camp = criarCampeonato(userId, Formato.PONTOS_CORRIDOS);

        ResponseEntity<CampeonatoResumoPublicoDto[]> resp = rest.getForEntity(
                "/api/public/campeonatos", CampeonatoResumoPublicoDto[].class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isNotNull();
        assertThat(java.util.Arrays.stream(resp.getBody()).map(CampeonatoResumoPublicoDto::id))
                .contains(camp.id());
    }

    @Test
    void endpointProtegidoRetorna401SemToken() {
        ResponseEntity<String> resp = rest.getForEntity("/api/campeonatos", String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void loginViaHttpRetornaToken() {
        authService.register(new RegisterRequest("HTTP User", "http@teste.com", "senha1234"));
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> body = new HttpEntity<>(
                "{\"email\":\"http@teste.com\",\"senha\":\"senha1234\"}", h);
        ResponseEntity<AuthResponse> resp = rest.postForEntity("/api/auth/login", body, AuthResponse.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().token()).isNotBlank();
    }
}
