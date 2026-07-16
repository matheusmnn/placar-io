import { Navigate } from 'react-router';
import { ReactNode } from 'react';
import { useAuth } from '../lib/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLogged } = useAuth();
  if (!isLogged) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
