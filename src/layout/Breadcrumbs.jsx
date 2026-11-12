import { Link, useLocation } from 'react-router-dom';
import { findNavItem, subCrumb } from './navigation.js';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const match = findNavItem(pathname);

  const crumbs = [{ label: 'Início', to: '/' }];
  if (match && match.item.to !== '/') {
    crumbs.push({ label: match.group });
    const sub = subCrumb(match.item.to, pathname);
    crumbs.push({ label: match.item.label, to: match.item.to });
    if (sub) crumbs.push({ label: sub });
  } else if (!match) {
    crumbs.push({ label: 'Página não encontrada' });
  }

  return (
    <nav className="nx-breadcrumbs min-w-0" aria-label="Trilha de navegação">
      <ol className="breadcrumb">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className={`breadcrumb-item ${last ? 'active' : ''}`}
              aria-current={last ? 'page' : undefined}
            >
              {!last && crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
