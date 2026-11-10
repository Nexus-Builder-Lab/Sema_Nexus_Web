import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página não encontrada" />
      <div className="card shadow-sm">
        <EmptyState
          title="O endereço acessado não existe ou ainda não foi implementado."
          action={
            <Link to="/" className="btn btn-primary">
              Voltar para o início
            </Link>
          }
        />
      </div>
    </>
  );
}
