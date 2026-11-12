const ROTULO = { IGUAL: 'igual', REMOVIDO: 'removido', ADICIONADO: 'adicionado' };
const SINAL = { IGUAL: ' ', REMOVIDO: '−', ADICIONADO: '+' };
const CLASSE = {
  IGUAL: '',
  REMOVIDO: 'bg-danger-subtle text-danger-emphasis',
  ADICIONADO: 'bg-success-subtle text-success-emphasis',
};

/** Diff textual por linhas com destaque (cor + sinal + rótulo acessível). */
export default function DiffView({ linhas = [] }) {
  if (linhas.length === 0) {
    return <p className="text-body-secondary">Sem linhas para comparar.</p>;
  }
  return (
    <div
      className="border rounded font-monospace fs-6"
      role="table"
      aria-label="Diferenças linha a linha"
    >
      {linhas.map((l, i) => (
        <div
          key={i}
          role="row"
          data-testid={`diff-${(l.tipo || 'IGUAL').toLowerCase()}`}
          className={`d-flex px-2 py-1 ${CLASSE[l.tipo] ?? ''}`}
        >
          <span aria-hidden="true" className="me-2 fw-bold">
            {SINAL[l.tipo] ?? ' '}
          </span>
          <span className="visually-hidden">{ROTULO[l.tipo] ?? 'igual'}: </span>
          <span role="cell" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {l.texto}
          </span>
        </div>
      ))}
    </div>
  );
}
