import Icon from '../components/Icon.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';
import NotificationBell from './NotificationBell.jsx';

/**
 * Barra superior. `user` e `onLogout` chegam do AuthContext (Issue #4);
 * o sino (NotificationBell) consulta /api/notificacoes.
 */
export default function Topbar({ sidebarId, mobileOpen, onToggleMobile, user, onLogout }) {
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
        <NotificationBell />
        {user && (
          <div className="nx-user text-truncate">
            <strong className="text-truncate">{user.nome}</strong>
            {user.perfil && <span>{user.perfil}</span>}
          </div>
        )}
        {onLogout && (
          <button
            type="button"
            className="nx-icon-btn"
            onClick={onLogout}
            aria-label="Sair"
            title="Sair"
          >
            <Icon name="logout" />
          </button>
        )}
      </div>
    </header>
  );
}
