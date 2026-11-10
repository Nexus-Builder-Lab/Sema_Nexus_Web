import PageHeader from '../../components/PageHeader.jsx';

const MODULOS = [
  {
    nome: 'SEMA Intelligence',
    descricao: 'Dashboards, mapa de Mato Grosso e indicadores ambientais simulados.',
  },
  {
    nome: 'SEMA Flux',
    descricao: 'Demandas de fiscalização: cadastro, triagem, distribuição e conclusão.',
  },
  {
    nome: 'SEMA DocIA',
    descricao: 'Biblioteca documental com busca textual e assistente em modo demonstrativo.',
  },
];

// Página inicial provisória: o dashboard chega na Issue #8.
export default function HomePage() {
  return (
    <>
      <PageHeader
        module="Core"
        title="SEMA NEXUS"
        description="Plataforma demonstrativa de inteligência ambiental, gestão de demandas de fiscalização e gestão documental no contexto de Mato Grosso."
      />
      <div className="row g-3">
        {MODULOS.map((modulo) => (
          <div className="col-12 col-md-6 col-xl-4" key={modulo.nome}>
            <section className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="h6 text-primary">{modulo.nome}</h2>
                <p className="mb-0 text-body-secondary">{modulo.descricao}</p>
              </div>
            </section>
          </div>
        ))}
      </div>
      <p className="text-body-secondary small mt-4 mb-0">
        Sem integração com sistemas institucionais. Todos os dados exibidos são simulados.
      </p>
    </>
  );
}
