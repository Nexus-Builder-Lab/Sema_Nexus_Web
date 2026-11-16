import { Leaf } from 'lucide-react';
import { NOME_SISTEMA } from '../config/sistema';

/** Marca do sistema ({@link NOME_SISTEMA}): chip verde com folha + nome. Usada no login e na sidebar. */
export default function Logo({ subtitulo = 'Ambiente demonstrativo', className = '' }) {
  return (
    <span className={`nx-logo ${className}`.trim()}>
      <span className="nx-brand-mark" aria-hidden="true">
        <Leaf size={22} strokeWidth={2.4} />
      </span>
      <span className="nx-brand-text">
        <strong>{NOME_SISTEMA}</strong>
        {subtitulo && <span>{subtitulo}</span>}
      </span>
    </span>
  );
}
