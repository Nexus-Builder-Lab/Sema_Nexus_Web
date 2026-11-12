import { MODULES } from '../layout/navigation.js';
import Icon from './Icon.jsx';

// Aceita "Intelligence", "SEMA Intelligence", "Flux", "DocIA", "Core"...
function resolverModulo(module) {
  const chave = String(module)
    .toLowerCase()
    .replace(/^sema\s+/, '')
    .replace(/^nexus$/, 'core');
  return MODULES[chave] ?? { label: module, icon: 'layers' };
}

/** Cabeçalho de página: eyebrow do módulo com ícone, título, subtítulo e ações à direita. */
export default function PageHeader({ title, description, module, actions }) {
  const modulo = module ? resolverModulo(module) : null;
  return (
    <header className="nx-page-header">
      <div className="min-w-0">
        {modulo && (
          <div className="nx-module-tag">
            <Icon name={modulo.icon} size={13} />
            {modulo.label}
          </div>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="nx-page-actions d-flex gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
