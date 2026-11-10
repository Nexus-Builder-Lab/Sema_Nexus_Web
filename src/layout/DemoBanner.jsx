import Icon from '../components/Icon.jsx';

export const DEMO_TEXT = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';

/** Faixa fixa exibida em todas as páginas do layout. */
export default function DemoBanner() {
  return (
    <div className="nx-demo-banner" role="note" aria-label="Aviso de ambiente demonstrativo">
      <Icon name="alert" />
      <span>{DEMO_TEXT}</span>
      <span className="fw-normal d-none d-md-inline">
        · Sem integração com sistemas institucionais.
      </span>
    </div>
  );
}
