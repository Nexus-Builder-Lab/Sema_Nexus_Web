import { Leaf } from 'lucide-react';
import { DEMO_SEAL_TEXT } from '../../../components/DemoSeal.jsx';

/** Tabela simples (cabeçalho + linhas) usada nas seções do relatório; vazia mostra uma linha de aviso. */
export function TabelaRelatorio({ caption, headers, rows }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle nx-report-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((linha, i) => (
              <tr key={i}>
                {linha.map((celula, j) => (
                  <td key={j}>{celula}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="text-center text-body-secondary">
                Nenhum registro no período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Folha do relatório gerencial: cabeçalho (marca, título, período, emissão), KPIs, seções de apoio,
 * conteúdo principal (`children`) e rodapé com o aviso demonstrativo. É o que a impressão (PDF) mostra.
 */
export default function RelatorioFolha({
  titulo,
  periodo,
  setor,
  emitidoEm,
  emitidoPor,
  kpis,
  secoes = [],
  aviso,
  children,
}) {
  return (
    <article className="card shadow-sm nx-report-sheet" aria-label={`Relatório: ${titulo}`}>
      <div className="card-body">
        <header className="nx-report-header">
          <div className="nx-report-inst">
            <span className="nx-brand-mark" aria-hidden="true">
              <Leaf size={22} strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="h5 mb-0">{titulo}</h2>
              <div className="small text-body-secondary">
                SEMA ALERTA · Relatório gerencial — ambiente demonstrativo
              </div>
            </div>
          </div>
          <div className="nx-report-meta small text-body-secondary">
            <div>Período: {periodo}</div>
            <div>Setor: {setor}</div>
            <div>
              Emitido em {emitidoEm}
              {emitidoPor ? ` por ${emitidoPor}` : ''}
            </div>
          </div>
        </header>

        {kpis && (
          <div className="nx-report-kpis" role="list" aria-label="Indicadores do relatório">
            {kpis.map((k) => (
              <div key={k.label} role="listitem">
                <span>{k.label}</span>
                <strong>{k.valor}</strong>
              </div>
            ))}
          </div>
        )}

        {aviso && <p className="small text-body-secondary">{aviso}</p>}

        {secoes.map((s) => (
          <section key={s.titulo} className="mb-4">
            <h3 className="h6">{s.titulo}</h3>
            <TabelaRelatorio caption={s.titulo} headers={s.headers} rows={s.rows} />
          </section>
        ))}

        {children}

        <footer className="nx-report-foot small text-body-secondary">
          {DEMO_SEAL_TEXT}. Documento gerado automaticamente pelo SEMA ALERTA com dados fictícios;
          não possui valor oficial. Municípios e biomas seguem o IBGE.
        </footer>
      </div>
    </article>
  );
}
