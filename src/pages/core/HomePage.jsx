// Página inicial provisória (Issue #1). Será substituída pelo layout e dashboard nas Issues #3 e #8.
export default function HomePage() {
  return (
    <main className="container py-5">
      <div className="alert alert-warning text-center fw-semibold" role="status">
        AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS
      </div>
      <h1 className="h3 text-primary">SEMA NEXUS</h1>
      <p className="lead">
        Plataforma demonstrativa de inteligência ambiental, gestão de demandas de fiscalização e
        gestão documental no contexto de Mato Grosso.
      </p>
      <p className="text-body-secondary">
        Sem integração com sistemas institucionais. Todos os dados exibidos são simulados.
      </p>
    </main>
  );
}
