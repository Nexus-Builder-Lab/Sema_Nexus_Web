export const DEMO_SEAL_TEXT = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';

/** Selo discreto para painéis com dados simulados (além da faixa fixa do layout). */
export default function DemoSeal({ className = '' }) {
  return (
    <span className={`badge nx-demo-seal ${className}`.trim()} data-testid="demo-seal">
      {DEMO_SEAL_TEXT}
    </span>
  );
}
