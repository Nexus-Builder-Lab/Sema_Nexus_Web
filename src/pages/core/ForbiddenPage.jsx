import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';

/** Exibida quando o perfil do usuário não acessa a tela (a API também responde 403). */
export default function ForbiddenPage() {
  return (
    <>
      <PageHeader title="Acesso negado" />
      <div className="card shadow-sm">
        <EmptyState
          title="Seu perfil não tem permissão para acessar esta tela."
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
