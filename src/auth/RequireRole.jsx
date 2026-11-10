import { Outlet } from 'react-router-dom';
import ForbiddenPage from '../pages/core/ForbiddenPage.jsx';
import { useAuth } from './useAuth.js';

/**
 * Restringe uma rota a perfis (`roles`). É conveniência de interface: quem decide
 * a autorização é a API (403) — esconder a tela não é segurança.
 */
export default function RequireRole({ roles, children }) {
  const { usuario } = useAuth();
  if (!usuario || !roles.includes(usuario.perfil)) {
    return <ForbiddenPage />;
  }
  return children ?? <Outlet />;
}
