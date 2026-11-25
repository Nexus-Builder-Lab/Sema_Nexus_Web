import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';
import NotificationBell from './NotificationBell.jsx';

const PERFIS = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  FISCAL: 'Fiscal',
  ANALISTA: 'Analista',
  CONSULTA: 'Consulta',
};

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

function MenuUsuario({ user, onLogout }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => !raiz.current?.contains(e.target) && setAberto(false);
    const esc = (e) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  return (
    <div className="nx-user-menu" ref={raiz}>
      <button
        type="button"
        className="nx-user-btn"
        onClick={() => setAberto(!aberto)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu do usuário"
      >
        <span className="nx-avatar" aria-hidden="true">
          {iniciais(user.nome)}
        </span>
        <span className="nx-user text-truncate">
          <strong className="text-truncate">{user.nome}</strong>
          {user.perfil && <span>{PERFIS[user.perfil] ?? user.perfil}</span>}
        </span>
        <Icon name="chevronDown" size={14} />
      </button>
      {aberto && (
        <div className="nx-user-dropdown" role="menu">
          <div className="nx-user-dropdown-head">
            <strong>{user.nome}</strong>
            {user.email && <span>{user.email}</span>}
          </div>
          {onLogout && (
            <button type="button" role="menuitem" onClick={onLogout}>
              <Icon name="logout" size={16} /> Sair
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Barra superior. `user` e `onLogout` chegam do AuthContext (Issue #4);
 * o sino (NotificationBell) consulta /api/notificacoes.
 */
export default function Topbar({
  sidebarId,
  mobileOpen,
  onToggleMobile,
  user,
  onLogout,
  onAbrirAssistente,
}) {
  return (
    <header className="nx-topbar">
      <button
        type="button"
        className="nx-icon-btn nx-menu-btn"
        onClick={onToggleMobile}
        aria-controls={sidebarId}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        <Icon name="menu" />
      </button>
      <Breadcrumbs />
      <div className="nx-topbar-actions">
        <GlobalSearch user={user} />
        {onAbrirAssistente && (
          <button
            type="button"
            className="nx-icon-btn"
            onClick={onAbrirAssistente}
            aria-label="Assistente global (Ctrl+K)"
            aria-haspopup="dialog"
            title="Assistente global (Ctrl+K)"
          >
            <Icon name="assistant" />
          </button>
        )}
        <NotificationBell />
        {user && <MenuUsuario user={user} onLogout={onLogout} />}
      </div>
    </header>
  );
}
