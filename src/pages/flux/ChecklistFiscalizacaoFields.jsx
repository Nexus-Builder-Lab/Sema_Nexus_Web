import { LIMITE_NUMERO_CHECKLIST, LIMITE_TEXTO_CHECKLIST } from './fiscalizacaoChecklist.js';

/**
 * Campos dinâmicos do checklist estruturado por categoria no modal de fiscalização.
 * Segue o modelo retornado por `GET /api/demandas/checklists`.
 */
export default function ChecklistFiscalizacaoFields({
  modelo,
  valores,
  erros = {},
  preservadoAnterior = false,
  alterado = false,
  onChange,
  onLimpar,
}) {
  if (!modelo?.itens?.length) return null;

  return (
    <fieldset className="border rounded p-3 mb-3">
      <legend className="float-none w-auto px-2 fs-6 fw-semibold mb-1">
        Checklist da categoria — {modelo.rotulo} (v{modelo.versao})
      </legend>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <p className="small text-body-secondary mb-0">
          {preservadoAnterior && !alterado
            ? 'Checklist anterior carregado. Se não alterar os itens, o checklist anterior será preservado no reenvio.'
            : 'Checklist demonstrativo por categoria (opcional se deixado em branco).'}
        </p>
        {(alterado || Object.values(valores).some((v) => v !== null && v !== '')) && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onLimpar}>
            {preservadoAnterior ? 'Restaurar checklist anterior' : 'Limpar checklist'}
          </button>
        )}
      </div>

      {modelo.itens.map((item) => {
        const chaveErro = `checklist.${item.id}`;
        const erro = erros[chaveErro];
        const baseId = `fx-chk-${item.id}`;
        const erroId = `${baseId}-erro`;

        if (item.tipo === 'BOOLEANO') {
          const atual = valores[item.id];
          const opcoes = [
            { valor: true, rotulo: 'Sim', sufixo: 'sim' },
            { valor: false, rotulo: 'Não', sufixo: 'nao' },
            ...(!item.obrigatorio ? [{ valor: null, rotulo: 'Não informado', sufixo: 'ni' }] : []),
          ];
          return (
            <fieldset key={item.id} className="mb-3">
              <legend className="col-form-label pt-0 pb-1 fw-normal">
                {item.rotulo}
                {item.obrigatorio ? ' *' : ''}
              </legend>
              <div className="d-flex flex-wrap gap-3">
                {opcoes.map((op) => {
                  const optId = `${baseId}-${op.sufixo}`;
                  return (
                    <div className="form-check" key={op.sufixo}>
                      <input
                        className={`form-check-input${erro ? ' is-invalid' : ''}`}
                        type="radio"
                        name={baseId}
                        id={optId}
                        checked={atual === op.valor}
                        aria-describedby={erro ? erroId : undefined}
                        onChange={() => onChange(item.id, op.valor)}
                      />
                      <label className="form-check-label" htmlFor={optId}>
                        {op.rotulo}
                      </label>
                    </div>
                  );
                })}
              </div>
              {erro && (
                <div id={erroId} className="invalid-feedback d-block">
                  {erro}
                </div>
              )}
            </fieldset>
          );
        }

        if (item.tipo === 'NUMERO') {
          return (
            <div className="mb-3" key={item.id}>
              <label htmlFor={baseId} className="form-label">
                {item.rotulo}
                {item.obrigatorio ? ' *' : ''}
              </label>
              <input
                id={baseId}
                name={baseId}
                type="number"
                step="any"
                min="0"
                max={LIMITE_NUMERO_CHECKLIST}
                inputMode="decimal"
                className={`form-control${erro ? ' is-invalid' : ''}`}
                value={valores[item.id] ?? ''}
                aria-invalid={erro ? 'true' : undefined}
                aria-describedby={erro ? erroId : undefined}
                onChange={(e) => onChange(item.id, e.target.value)}
              />
              {erro && (
                <div id={erroId} className="invalid-feedback">
                  {erro}
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="mb-3" key={item.id}>
            <label htmlFor={baseId} className="form-label">
              {item.rotulo}
              {item.obrigatorio ? ' *' : ''}
            </label>
            <textarea
              id={baseId}
              name={baseId}
              rows={2}
              maxLength={LIMITE_TEXTO_CHECKLIST}
              className={`form-control${erro ? ' is-invalid' : ''}`}
              value={valores[item.id] ?? ''}
              aria-invalid={erro ? 'true' : undefined}
              aria-describedby={erro ? erroId : undefined}
              onChange={(e) => onChange(item.id, e.target.value)}
            />
            {erro && (
              <div id={erroId} className="invalid-feedback">
                {erro}
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
