package io.placar.service;

import io.placar.domain.Usuario;
import io.placar.exception.ConflictException;
import io.placar.exception.UnauthorizedException;
import io.placar.repository.UsuarioRepository;
import io.placar.security.JwtService;
import io.placar.web.dto.AuthResponse;
import io.placar.web.dto.LoginRequest;
import io.placar.web.dto.RegisterRequest;
import io.placar.web.dto.UsuarioDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (usuarioRepository.existsByEmail(email)) {
            throw new ConflictException("Ja existe uma conta com esse email");
        }
        Usuario u = new Usuario();
        u.setNome(req.nome().trim());
        u.setEmail(email);
        u.setSenhaHash(passwordEncoder.encode(req.senha()));
        u = usuarioRepository.save(u);
        String token = jwtService.generate(u.getId(), u.getEmail());
        return new AuthResponse(token, UsuarioDto.from(u));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Email ou senha incorretos"));
        if (!passwordEncoder.matches(req.senha(), u.getSenhaHash())) {
            throw new UnauthorizedException("Email ou senha incorretos");
        }
        String token = jwtService.generate(u.getId(), u.getEmail());
        return new AuthResponse(token, UsuarioDto.from(u));
    }
}
