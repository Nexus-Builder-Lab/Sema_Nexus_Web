import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth.js';

/** Sem sessão, leva ao login guardando a rota pedida para voltar depois. */
export default function ProtectedRoute({ children }) {
  const { autenticado } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children ?? <Outlet />;
}
