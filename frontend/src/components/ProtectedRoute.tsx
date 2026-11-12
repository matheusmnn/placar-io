import { Navigate, useLocation } from 'react-router';
import { ReactNode } from 'react';
import { useAuth } from '../lib/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLogged, usuario } = useAuth();
  const location = useLocation();
  if (!isLogged) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (usuario && usuario.username == null && location.pathname !== '/escolher-username') {
    return <Navigate to="/escolher-username" replace />;
  }
  return <>{children}</>;
}
