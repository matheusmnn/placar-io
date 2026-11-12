import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { auth, registrarOnUnauthorized, AuthResponse, Usuario, api } from './api';
import { campeonatoAtivo } from './session';

interface AuthState {
  usuario: Usuario | null;
  isLogged: boolean;
  entrar: (r: AuthResponse) => void;
  sair: () => void;
  atualizarUsuario: (u: Usuario) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function usuarioInicial(): Usuario | null {
  return auth.isLogged() ? auth.getUser() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioInicial);

  const entrar = useCallback((r: AuthResponse) => {
    auth.save(r);
    campeonatoAtivo.clear();
    setUsuario(r.usuario);
  }, []);

  const sair = useCallback(() => {
    auth.clear();
    campeonatoAtivo.clear();
    setUsuario(null);
  }, []);

  const atualizarUsuario = useCallback((u: Usuario) => {
    const token = auth.getToken();
    if (token) auth.save({ token, usuario: u });
    setUsuario(u);
  }, []);

  useEffect(() => {
    registrarOnUnauthorized(() => {
      auth.clear();
      campeonatoAtivo.clear();
      setUsuario(null);
    });
  }, []);

  // Refresca o usuário vindo do backend ao montar, pra cobrir sessões antigas que
  // não tinham `username` no localStorage.
  useEffect(() => {
    if (!auth.isLogged()) return;
    const cached = auth.getUser();
    if (cached && cached.username !== undefined) return;
    api.me().then(({ usuario: u }) => atualizarUsuario(u)).catch(() => { /* 401 já trata via onUnauthorized */ });
  }, [atualizarUsuario]);

  return (
    <AuthContext.Provider value={{ usuario, isLogged: !!usuario, entrar, sair, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
