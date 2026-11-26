import { formatarValorChecklist } from './fiscalizacaoChecklist.js';

/** Exibe o checklist estruturado gravado na fiscalização dentro de `DemandaDetailPage`. */
export default function ChecklistResumo({ checklist, modelos = [] }) {
  if (!checklist?.itens) return null;

  const modelo = modelos?.find((m) => m.categoria === checklist.categoria);
  const itensModelo = modelo?.itens ?? [];
  const chavesModelo = new Set(itensModelo.map((i) => i.id));
  const extras = Object.keys(checklist.itens).filter((k) => !chavesModelo.has(k));

  return (
    <div className="mt-3 pt-3 border-top">
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
        <h3 className="h6 mb-0">Checklist da fiscalização</h3>
        <span className="nx-badge nx-badge-gray">
          {modelo?.rotulo ?? checklist.categoria} · v{checklist.versao ?? 1}
        </span>
      </div>
      <dl className="row g-2 mb-0">
        {itensModelo.map((item) => {
          const tem = Object.hasOwn(checklist.itens, item.id);
          return (
            <div className="col-12 col-md-6" key={item.id}>
              <dt className="text-body-secondary small fw-normal">{item.rotulo}</dt>
              <dd className="mb-0">
                {tem ? formatarValorChecklist(checklist.itens[item.id]) : 'Não informado'}
              </dd>
            </div>
          );
        })}
        {extras.map((chave) => (
          <div className="col-12 col-md-6" key={chave}>
            <dt className="text-body-secondary small fw-normal">{chave}</dt>
            <dd className="mb-0">{formatarValorChecklist(checklist.itens[chave])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
