import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { auth, registrarOnUnauthorized, AuthResponse, Usuario } from './api';
import { campeonatoAtivo } from './session';

interface AuthState {
  usuario: Usuario | null;
  isLogged: boolean;
  entrar: (r: AuthResponse) => void;
  sair: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function usuarioInicial(): Usuario | null {
  return auth.isLogged() ? auth.getUser() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioInicial);

  const entrar = useCallback((r: AuthResponse) => {
    auth.save(r);
    setUsuario(r.usuario);
  }, []);

  const sair = useCallback(() => {
    auth.clear();
    campeonatoAtivo.clear();
    setUsuario(null);
  }, []);

  useEffect(() => {
    registrarOnUnauthorized(() => {
      auth.clear();
      campeonatoAtivo.clear();
      setUsuario(null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, isLogged: !!usuario, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
