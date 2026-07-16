package io.placar.web.dto;

import io.placar.domain.Usuario;

public record UsuarioDto(Long id, String nome, String email) {
    public static UsuarioDto from(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNome(), u.getEmail());
    }
}
