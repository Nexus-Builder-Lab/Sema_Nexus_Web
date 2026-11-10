import Icon from '../components/Icon.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';

/**
 * Barra superior. `user` e `onLogout` chegam do AuthContext (Issue #4);
 * o sino de notificações fica desabilitado até a Issue de notificações.
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
        <button
          type="button"
          className="nx-icon-btn"
          disabled
          aria-label="Notificações (em breve)"
          title="Notificações (em breve)"
        >
          <Icon name="bell" />
        </button>
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
