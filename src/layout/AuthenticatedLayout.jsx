import { useAuth } from '../auth/useAuth.js';
import AppLayout from './AppLayout.jsx';

/** Liga o layout ao usuário autenticado (nome, perfil e botão Sair). */
export default function AuthenticatedLayout() {
  const { usuario, logout } = useAuth();
  return <AppLayout user={usuario} onLogout={logout} />;
}
