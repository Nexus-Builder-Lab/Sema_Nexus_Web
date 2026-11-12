import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { obterResumo } from '../api/intelligenceApi.js';
import { useAuth } from '../auth/useAuth.js';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { NAVIGATION } from './navigation.js';

/** Quantidade de demandas atrasadas (badge do menu). Falha silenciosa: o badge só some. */
function useAtrasadas(ativo) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!ativo) return undefined;
    let cancelado = false;
    obterResumo()
      .then((resumo) => !cancelado && setTotal(Number(resumo?.atrasadas) || 0))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [ativo]);
  return total;
}

export default function Sidebar({ id, collapsed, onToggleCollapse, onNavigate }) {
  const { usuario } = useAuth();
  const atrasadas = useAtrasadas(Boolean(usuario));
  // Esconder o item é conveniência: a API é quem autoriza (403).
  const grupos = NAVIGATION.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(usuario?.perfil)),
  })).filter((g) => g.items.length > 0);
  return (
    <aside className="nx-sidebar" id={id} aria-label="Menu principal">
      <div className="nx-sidebar-head">
        <Logo />
      </div>
      <nav aria-label="Módulos">
        {grupos.map(({ group, subtitle, items }) => (
          <div className="nx-nav-group" key={group}>
            <p className="nx-nav-group-title">
              {group}
              {subtitle && <small>{subtitle}</small>}
            </p>
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
                    {item.to === '/flux/painel' && atrasadas > 0 && (
                      <span
                        className="nx-nav-badge"
                        title={`${atrasadas} demanda(s) atrasada(s)`}
                        aria-label={`${atrasadas} atrasadas`}
                      >
                        {atrasadas}
                      </span>
                    )}
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
