import { rotuloFerramenta } from '../api/agentesStream.js';

/**
 * Progresso ao vivo de um agente (SSE): "Iniciando…", cada ferramenta ao iniciar/concluir, texto
 * parcial e o aviso do modo demonstrativo. Região `role="status"` (aria-live polite) para leitores de tela.
 */
export default function ProgressoAgente({ progresso, rotulo = 'O agente está trabalhando' }) {
  const { iniciado, ferramentas, texto, fallback } = progresso;
  return (
    <div role="status" aria-live="polite" data-testid="progresso-agente">
      <div className="d-flex align-items-center gap-2">
        <span className="spinner-border spinner-border-sm text-success" aria-hidden="true" />
        <span>{iniciado ? `${rotulo}…` : 'Iniciando…'}</span>
      </div>
      {fallback && (
        <div className="small text-warning-emphasis mt-1" data-testid="progresso-fallback">
          Modo demonstrativo: {fallback}
        </div>
      )}
      {ferramentas.length > 0 && (
        <ul className="small mb-0 mt-1 list-unstyled">
          {ferramentas.map((f) => (
            <li key={f.ordem} data-estado={f.estado}>
              {f.estado === 'executando' && `${rotuloFerramenta(f.nome)}…`}
              {f.estado === 'ok' && `${rotuloFerramenta(f.nome)}: concluído`}
              {f.estado === 'erro' && `${rotuloFerramenta(f.nome)}: não foi possível`}
            </li>
          ))}
        </ul>
      )}
      {texto && (
        <p className="small fst-italic mb-0 mt-1" data-testid="progresso-texto">
          {texto}
        </p>
      )}
    </div>
  );
}
