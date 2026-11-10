import { NavLink } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { NAVIGATION } from './navigation.js';

export default function Sidebar({ id, collapsed, onToggleCollapse, onNavigate }) {
  return (
    <aside className="nx-sidebar" id={id} aria-label="Menu principal">
      <div className="nx-sidebar-head">
        <span className="nx-brand-mark" aria-hidden="true">
          SN
        </span>
        <span className="nx-brand-text">
          <strong>SEMA NEXUS</strong>
          <span>Ambiente demonstrativo</span>
        </span>
      </div>
      <nav aria-label="Módulos">
        {NAVIGATION.map(({ group, items }) => (
          <div className="nx-nav-group" key={group}>
            <p className="nx-nav-group-title">{group}</p>
            <ul className="list-unstyled mb-0">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className="nx-nav-link"
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="nx-nav-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="nx-sidebar-foot nx-collapse-btn">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-controls={id}
          aria-expanded={!collapsed}
        >
          <Icon name="chevronLeft" className={collapsed ? 'nx-rotate-180' : ''} />
          <span className="nx-nav-label" aria-hidden="true">
            {collapsed ? 'Expandir menu' : 'Recolher menu'}
          </span>
        </button>
      </div>
    </aside>
  );
}
